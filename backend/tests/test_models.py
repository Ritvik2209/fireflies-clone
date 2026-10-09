"""The database itself enforces the delete rules (this only works with PRAGMA foreign_keys=ON)."""

from datetime import UTC, datetime

import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    ActionItem,
    Chapter,
    Meeting,
    Participant,
    Summary,
    TranscriptSegment,
    User,
    meeting_participants,
)


def _meeting_with_children(db: Session) -> tuple[Meeting, Participant]:
    speaker = Participant(name="Priya Shah", avatar_color="green")
    meeting = Meeting(
        owner=User(name="Alex Morgan", email="alex@example.com"),
        title="Sprint planning",
        meeting_date=datetime(2026, 10, 6, 4, 30, tzinfo=UTC),
        duration_ms=60_000,
        source="seed",
        participants=[speaker],
        segments=[
            TranscriptSegment(position=0, speaker=speaker, start_ms=0, end_ms=5_000, text="Hi.")
        ],
        summary=Summary(overview="Planning.", keywords=["sprint"], generated_by="seed"),
        chapters=[Chapter(position=0, title="Goals", start_ms=0)],
        action_items=[ActionItem(text="Write the plan", assignee=speaker)],
    )
    db.add(meeting)
    db.commit()
    return meeting, speaker


def _count(db: Session, model: type) -> int:
    return db.scalar(select(func.count()).select_from(model)) or 0


def test_deleting_a_meeting_cascades_to_its_children_but_not_to_people(db: Session) -> None:
    meeting, _ = _meeting_with_children(db)

    # A raw SQL delete bypasses the ORM, so only the database's ON DELETE CASCADE can clean up.
    db.execute(delete(Meeting).where(Meeting.id == meeting.id))
    db.commit()

    for model in (TranscriptSegment, Summary, Chapter, ActionItem):
        assert _count(db, model) == 0
    assert db.scalar(select(func.count()).select_from(meeting_participants)) == 0
    assert _count(db, Participant) == 1


def test_a_participant_who_spoke_cannot_be_deleted(db: Session) -> None:
    _, speaker = _meeting_with_children(db)

    with pytest.raises(IntegrityError):
        db.execute(delete(Participant).where(Participant.id == speaker.id))


def test_participant_names_match_case_insensitively(db: Session) -> None:
    _meeting_with_children(db)

    assert db.scalar(select(Participant.name).where(Participant.name == "PRIYA SHAH")) == (
        "Priya Shah"
    )


def test_datetimes_come_back_timezone_aware(db: Session) -> None:
    meeting, _ = _meeting_with_children(db)
    db.expire_all()

    assert db.get(Meeting, meeting.id).meeting_date == datetime(2026, 10, 6, 4, 30, tzinfo=UTC)


def test_an_error_message_exists_exactly_when_processing_failed(db: Session) -> None:
    meeting, _ = _meeting_with_children(db)
    assert (meeting.status, meeting.error_message) == ("ready", None)  # the default

    meeting.status = "failed"  # failed, but no message: the database refuses it
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()

    meeting.status, meeting.error_message = "failed", "Line 1: expected a timestamp"
    db.commit()
    meeting.status = "done"  # not one of processing / ready / failed
    with pytest.raises(IntegrityError):
        db.commit()
