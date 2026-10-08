"""Meeting use cases: list with filters, detail, the create pipeline, update and delete."""

from collections.abc import Iterable, Sequence
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.errors import ConflictError, NotFoundError
from app.models import ActionItem, Chapter, Meeting, Participant, Summary, TranscriptSegment, User
from app.models.types import utc_now
from app.parsers import ParsedSegment, parse_transcript
from app.schemas.meeting import MeetingCreate, MeetingFilters, MeetingUpdate
from app.services.participants import get_or_create_participant, normalize_name
from app.services.summary_generator import MeetingNotes, generate_notes

# Everything the meeting page shows: one extra query per collection, however long the
# transcript (no N+1).
_DETAIL_OPTIONS = (
    selectinload(Meeting.participants),
    selectinload(Meeting.segments),
    selectinload(Meeting.summary),
    selectinload(Meeting.chapters),
    selectinload(Meeting.action_items),
)


def list_meetings(db: Session, owner: User, filters: MeetingFilters) -> list[Meeting]:
    query = (
        select(Meeting)
        .where(Meeting.owner_id == owner.id)
        .options(selectinload(Meeting.participants))
    )
    if filters.q:
        # Case-insensitive substring match (SQLite's LIKE; autoescape treats % and _ literally).
        # A leading wildcard can't use an index, so this scans: fine for a library this size.
        query = query.where(Meeting.title.contains(filters.q, autoescape=True))
    if filters.participant_id is not None:
        # Becomes an EXISTS subquery on meeting_participants (indexed by participant_id).
        query = query.where(Meeting.participants.any(Participant.id == filters.participant_id))
    if filters.date_from is not None:
        query = query.where(Meeting.meeting_date >= filters.date_from)
    if filters.date_to is not None:
        query = query.where(Meeting.meeting_date <= filters.date_to)
    if filters.sort == "recent":
        query = query.order_by(Meeting.meeting_date.desc(), Meeting.id.desc())
    else:
        query = query.order_by(Meeting.meeting_date.asc(), Meeting.id.asc())
    return list(db.scalars(query))


def get_owned_meeting(db: Session, owner: User, meeting_id: int) -> Meeting:
    """The meeting row only. Someone else's meeting is "not found", so ids reveal nothing."""
    meeting = db.scalar(
        select(Meeting).where(Meeting.id == meeting_id, Meeting.owner_id == owner.id)
    )
    if meeting is None:
        raise NotFoundError(f"Meeting {meeting_id} not found")
    return meeting


def get_meeting(db: Session, owner: User, meeting_id: int) -> Meeting:
    """The meeting with everything the meeting page needs."""
    meeting = db.scalar(
        select(Meeting)
        .where(Meeting.id == meeting_id, Meeting.owner_id == owner.id)
        .options(*_DETAIL_OPTIONS)
    )
    if meeting is None:
        raise NotFoundError(f"Meeting {meeting_id} not found")
    return meeting


def create_meeting(db: Session, owner: User, data: MeetingCreate) -> Meeting:
    """Parse the transcript, generate notes and store it all in one transaction."""
    segments = parse_transcript(data.transcript_text, data.format)
    meeting = save_meeting(
        db,
        owner=owner,
        title=data.title,
        meeting_date=data.meeting_date,
        source=data.source,
        segments=segments,
        participant_names=data.participant_names,
        notes=generate_notes(segments),
    )
    meeting_id = meeting.id
    db.commit()  # all or nothing: no half-created meetings
    return get_meeting(db, owner, meeting_id)


def save_meeting(
    db: Session,
    *,
    owner: User,
    title: str,
    meeting_date: datetime,
    source: str,
    segments: Sequence[ParsedSegment],
    participant_names: Iterable[str],
    notes: MeetingNotes,
    duration_ms: int | None = None,
) -> Meeting:
    """Add a meeting with its transcript and notes to the current transaction (no commit).

    Shared by the create endpoint and the seed script, so both follow the same rules: segments
    are ordered by start time, and every speaker, named participant and assignee is matched to
    the directory by name and becomes a participant of the meeting.
    """
    ordered = sorted(segments, key=lambda segment: segment.start_ms)  # stable: ties keep order
    assignees = [item.assignee for item in notes.action_items if item.assignee]
    people = _resolve_people(
        db, [*(segment.speaker for segment in ordered), *participant_names, *assignees]
    )

    def person(name: str) -> Participant:
        return people[normalize_name(name).lower()]

    meeting = Meeting(
        owner=owner,
        title=title,
        meeting_date=meeting_date,
        source=source,
        duration_ms=duration_ms
        if duration_ms is not None
        else max((segment.end_ms for segment in ordered), default=0),
        participants=list(people.values()),
        segments=[
            TranscriptSegment(
                position=position,
                speaker=person(segment.speaker),
                start_ms=segment.start_ms,
                end_ms=segment.end_ms,
                text=segment.text,
            )
            for position, segment in enumerate(ordered)
        ],
        summary=Summary(
            overview=notes.overview, keywords=notes.keywords, generated_by=notes.generated_by
        ),
        chapters=[
            Chapter(position=position, title=chapter.title, start_ms=chapter.start_ms)
            for position, chapter in enumerate(notes.chapters)
        ],
        action_items=[
            ActionItem(
                text=item.text,
                assignee=person(item.assignee) if item.assignee else None,
                is_completed=item.is_completed,
                source_start_ms=item.start_ms,
            )
            for item in notes.action_items
        ],
    )
    db.add(meeting)
    db.flush()  # assigns ids, still inside the transaction
    return meeting


def update_meeting(db: Session, owner: User, meeting_id: int, data: MeetingUpdate) -> Meeting:
    meeting = get_meeting(db, owner, meeting_id)
    if data.title is not None:
        meeting.title = data.title
    if data.participant_names is not None:
        _replace_participants(db, meeting, data.participant_names)
    meeting.updated_at = utc_now()  # changing only the participant links wouldn't bump it
    db.commit()
    return get_meeting(db, owner, meeting_id)


def delete_meeting(db: Session, owner: User, meeting_id: int) -> None:
    # The ORM cascade deletes the meeting's segments, summary, chapters, action items and
    # participant links; participants themselves are shared and stay.
    db.delete(get_owned_meeting(db, owner, meeting_id))
    db.commit()


def _resolve_people(db: Session, names: Iterable[str]) -> dict[str, Participant]:
    """Map each distinct name (ignoring case) to a participant, creating missing ones."""
    people: dict[str, Participant] = {}
    for name in names:
        key = normalize_name(name).lower()
        if key and key not in people:
            people[key] = get_or_create_participant(db, name)
    return people


def _replace_participants(db: Session, meeting: Meeting, names: Iterable[str]) -> None:
    wanted = list(_resolve_people(db, names).values())
    db.flush()  # gives newly created participants their ids
    wanted_ids = {participant.id for participant in wanted}

    # Every transcript line must belong to a participant of its meeting.
    speaker_ids = {segment.speaker_id for segment in meeting.segments}
    still_needed = [
        participant.name
        for participant in meeting.participants
        if participant.id in speaker_ids and participant.id not in wanted_ids
    ]
    if still_needed:
        raise ConflictError(
            f"{', '.join(still_needed)} can't be removed: they speak in this meeting's transcript"
        )

    # Removed people's tasks in this meeting become unassigned rather than pointing at someone
    # who is no longer in it.
    removed_ids = {participant.id for participant in meeting.participants} - wanted_ids
    for item in meeting.action_items:
        if item.assignee_id in removed_ids:
            item.assignee_id = None
    meeting.participants = wanted
