"""Highlights, comments and soundbites (bonus 5). Every lookup goes through the meeting's owner,
so someone else's line, comment or soundbite is simply "not found"."""

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.errors import InvalidInputError, NotFoundError
from app.models import Highlight, Meeting, SegmentComment, Soundbite, TranscriptSegment, User
from app.schemas.annotations import SoundbiteCreate
from app.services.meetings import get_owned_meeting


def _owned_segment(db: Session, owner: User, segment_id: int) -> TranscriptSegment:
    segment = db.scalar(
        select(TranscriptSegment)
        .join(Meeting)
        .where(TranscriptSegment.id == segment_id, Meeting.owner_id == owner.id)
    )
    if segment is None:
        raise NotFoundError(f"Transcript line {segment_id} not found")
    return segment


def set_highlight(db: Session, owner: User, segment_id: int, color: str) -> Highlight:
    """Creates the user's highlight on a line, or changes its colour (one per user and line)."""
    _owned_segment(db, owner, segment_id)
    highlight = db.scalar(
        select(Highlight).where(Highlight.segment_id == segment_id, Highlight.user_id == owner.id)
    )
    if highlight is None:
        highlight = Highlight(segment_id=segment_id, user_id=owner.id, color=color)
        db.add(highlight)
    else:
        highlight.color = color
    db.commit()
    return highlight


def clear_highlight(db: Session, owner: User, segment_id: int) -> None:
    """Removes the user's highlight from a line (fine if there was none)."""
    _owned_segment(db, owner, segment_id)
    db.execute(
        delete(Highlight).where(Highlight.segment_id == segment_id, Highlight.user_id == owner.id)
    )
    db.commit()


def list_comments(db: Session, owner: User, segment_id: int) -> list[SegmentComment]:
    _owned_segment(db, owner, segment_id)
    query = (
        select(SegmentComment)
        .where(SegmentComment.segment_id == segment_id)
        .options(selectinload(SegmentComment.author))  # the author's name, without N+1
        .order_by(SegmentComment.id)
    )
    return list(db.scalars(query))


def add_comment(db: Session, owner: User, segment_id: int, text: str) -> SegmentComment:
    _owned_segment(db, owner, segment_id)
    comment = SegmentComment(segment_id=segment_id, user_id=owner.id, text=text)
    db.add(comment)
    db.commit()
    return comment


def _own_comment(db: Session, owner: User, comment_id: int) -> SegmentComment:
    """A comment the user wrote, on a meeting they own."""
    comment = db.scalar(
        select(SegmentComment)
        .join(TranscriptSegment)
        .join(Meeting)
        .where(
            SegmentComment.id == comment_id,
            SegmentComment.user_id == owner.id,
            Meeting.owner_id == owner.id,
        )
    )
    if comment is None:
        raise NotFoundError(f"Comment {comment_id} not found")
    return comment


def update_comment(db: Session, owner: User, comment_id: int, text: str) -> SegmentComment:
    comment = _own_comment(db, owner, comment_id)
    comment.text = text
    db.commit()
    return comment


def delete_comment(db: Session, owner: User, comment_id: int) -> None:
    db.delete(_own_comment(db, owner, comment_id))
    db.commit()


def list_soundbites(db: Session, owner: User, meeting_id: int) -> list[Soundbite]:
    return list(get_owned_meeting(db, owner, meeting_id).soundbites)


def create_soundbite(db: Session, owner: User, meeting_id: int, data: SoundbiteCreate) -> Soundbite:
    meeting = get_owned_meeting(db, owner, meeting_id)
    # The schema already checked start < end; only the service knows the meeting's length.
    if data.end_ms > meeting.duration_ms:
        raise InvalidInputError("The soundbite ends after the meeting does")
    soundbite = Soundbite(
        meeting=meeting,
        user_id=owner.id,
        title=data.title,
        start_ms=data.start_ms,
        end_ms=data.end_ms,
    )
    db.add(soundbite)
    db.commit()
    return soundbite


def _owned_soundbite(db: Session, owner: User, soundbite_id: int) -> Soundbite:
    soundbite = db.scalar(
        select(Soundbite)
        .join(Meeting)
        .where(Soundbite.id == soundbite_id, Meeting.owner_id == owner.id)
    )
    if soundbite is None:
        raise NotFoundError(f"Soundbite {soundbite_id} not found")
    return soundbite


def rename_soundbite(db: Session, owner: User, soundbite_id: int, title: str) -> Soundbite:
    soundbite = _owned_soundbite(db, owner, soundbite_id)
    soundbite.title = title
    db.commit()
    return soundbite


def delete_soundbite(db: Session, owner: User, soundbite_id: int) -> None:
    db.delete(_owned_soundbite(db, owner, soundbite_id))
    db.commit()
