"""Tags (bonus 2): reusable coloured labels, linked to meetings many-to-many."""

from typing import TYPE_CHECKING, Literal, get_args

from sqlalchemy import CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.associations import meeting_tags

if TYPE_CHECKING:
    from app.models.meeting import Meeting

# Palette keys for tag chips; the frontend maps each key to complete Tailwind classes.
TagColor = Literal["gray", "blue", "green", "yellow", "orange", "red", "pink", "purple"]
TAG_COLORS: tuple[str, ...] = get_args(TagColor)


class Tag(Base):
    __tablename__ = "tags"
    __table_args__ = (
        CheckConstraint("length(name) BETWEEN 1 AND 40", name="ck_tags_name_length"),
        CheckConstraint(
            f"color IN ({', '.join(repr(color) for color in TAG_COLORS)})",
            name="ck_tags_color",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # UNIQUE + NOCASE: "Sales" and "sales" are the same tag.
    name: Mapped[str] = mapped_column(String(40, collation="NOCASE"), unique=True)
    color: Mapped[str] = mapped_column(String(10))

    # Deleting a tag removes only its links (meeting_tags rows); the meetings stay.
    meetings: Mapped[list["Meeting"]] = relationship(secondary=meeting_tags, back_populates="tags")
