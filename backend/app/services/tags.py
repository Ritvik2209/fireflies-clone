"""Tags (bonus 2): list, create (names are unique, ignoring case) and delete."""

import zlib
from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import ConflictError, InvalidInputError, NotFoundError
from app.models import Tag
from app.models.tag import TAG_COLORS
from app.schemas.tag import TagCreate


def color_for_tag(name: str) -> str:
    """A colour derived from the name (crc32 is stable across restarts, unlike hash())."""
    return TAG_COLORS[zlib.crc32(name.lower().encode()) % len(TAG_COLORS)]


def list_tags(db: Session) -> list[Tag]:
    return list(db.scalars(select(Tag).order_by(Tag.name)))


def create_tag(db: Session, data: TagCreate) -> Tag:
    name = " ".join(data.name.split())  # "  Customer   call " → "Customer call"
    # tags.name is COLLATE NOCASE, so this finds "sales" when "Sales" exists.
    if db.scalar(select(Tag.id).where(Tag.name == name)) is not None:
        raise ConflictError(f"A tag called “{name}” already exists")
    tag = Tag(name=name, color=data.color or color_for_tag(name))
    db.add(tag)
    try:
        db.commit()
    except IntegrityError as error:  # two requests created the same name at the same moment
        db.rollback()
        raise ConflictError(f"A tag called “{name}” already exists") from error
    return tag


def delete_tag(db: Session, tag_id: int) -> None:
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise NotFoundError(f"Tag {tag_id} not found")
    db.delete(tag)  # the meeting_tags links go too; meetings stay
    db.commit()


def get_tags(db: Session, tag_ids: Iterable[int]) -> list[Tag]:
    """The tags with these ids, for assigning to a meeting. An unknown id is invalid input."""
    wanted = list(dict.fromkeys(tag_ids))  # drop duplicates, keep order
    tags = list(db.scalars(select(Tag).where(Tag.id.in_(wanted))))
    missing = set(wanted) - {tag.id for tag in tags}
    if missing:
        raise InvalidInputError(f"Unknown tag id: {', '.join(map(str, sorted(missing)))}")
    return tags
