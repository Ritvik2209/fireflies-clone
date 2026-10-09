"""Background processing for uploads (Extra 3).

POST /meetings saves the bare meeting as "processing" and returns 202 straight away. A FastAPI
background task then parses the transcript and writes the notes, in this same server process,
with its own database session. Either everything is saved and the meeting becomes "ready" in
one transaction, or nothing is saved and the meeting becomes "failed" with a readable message.

The limitation: a job lives in the web process, so it's lost if the server restarts mid-way,
and it can't spread across machines. Production would use a job queue (e.g. Celery or RQ with
Redis) with retries, and push status updates (WebSockets or SSE) instead of polling.
"""

import logging

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.errors import AppError
from app.models import Meeting, User
from app.parsers import parse_transcript
from app.schemas.meeting import MeetingCreate
from app.services.meetings import fill_meeting
from app.services.summary_generator import generate_notes

logger = logging.getLogger(__name__)

UNEXPECTED_ERROR = "Something went wrong while processing the transcript. Please try again."
INTERRUPTED = "Processing stopped when the server restarted. Please upload the transcript again."


def start_meeting(db: Session, owner: User, data: MeetingCreate) -> Meeting:
    """Saves the bare meeting as "processing" and commits, so the job and the poller can see it."""
    meeting = Meeting(
        owner=owner,
        title=data.title,
        meeting_date=data.meeting_date,
        source=data.source,
        duration_ms=0,  # known once the transcript is parsed
        status="processing",
    )
    db.add(meeting)
    db.commit()
    return meeting


def process_meeting(meeting_id: int, data: MeetingCreate) -> None:
    """The background job. It runs after the response is sent, so it opens its own session."""
    with SessionLocal() as db:
        meeting = db.get(Meeting, meeting_id)
        if meeting is None:  # deleted before the job started
            return
        try:
            segments = parse_transcript(data.transcript_text, data.format)
            fill_meeting(
                db,
                meeting,
                segments=segments,
                participant_names=data.participant_names,
                notes=generate_notes(segments),
            )
            meeting.status = "ready"
            db.commit()  # the transcript, notes, people and status, all at once
        except AppError as error:  # e.g. "Line 4: expected '[HH:MM:SS] Speaker: text'"
            db.rollback()  # nothing half-saved is kept
            _mark_failed(db, meeting_id, error.detail)
        except Exception:
            db.rollback()
            logger.exception("Processing meeting %s failed", meeting_id)
            _mark_failed(db, meeting_id, UNEXPECTED_ERROR)


def fail_interrupted(db: Session) -> int:
    """At startup: a meeting still "processing" lost its job when the server stopped."""
    result = db.execute(
        update(Meeting)
        .where(Meeting.status == "processing")
        .values(status="failed", error_message=INTERRUPTED)
    )
    db.commit()
    return result.rowcount


def _mark_failed(db: Session, meeting_id: int, message: str) -> None:
    # A plain UPDATE: if the meeting was deleted in the meantime, it simply changes no row.
    db.execute(
        update(Meeting)
        .where(Meeting.id == meeting_id)
        .values(status="failed", error_message=message[:500])
    )
    db.commit()
