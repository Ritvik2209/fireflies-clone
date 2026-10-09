"""Annotations (bonus 5): highlights and comments on transcript lines, and soundbites."""

from datetime import datetime
from typing import TYPE_CHECKING, Literal, get_args

from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.types import UTCDateTime, utc_now

if TYPE_CHECKING:
    from app.models.meeting import Meeting
    from app.models.transcript import TranscriptSegment
    from app.models.user import User

HighlightColor = Literal["yellow", "green", "blue", "pink"]
HIGHLIGHT_COLORS: tuple[str, ...] = get_args(HighlightColor)


class Highlight(Base):
    """A user's colour on one transcript line. One per user and line: a new colour replaces it."""

    __tablename__ = "highlights"
    __table_args__ = (
        UniqueConstraint("segment_id", "user_id", name="uq_highlights_segment_user"),
        CheckConstraint(
            f"color IN ({', '.join(repr(color) for color in HIGHLIGHT_COLORS)})",
            name="ck_highlights_color",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    segment_id: Mapped[int] = mapped_column(
        ForeignKey("transcript_segments.id", ondelete="CASCADE")
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    color: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now)

    segment: Mapped["TranscriptSegment"] = relationship(back_populates="highlights")


class SegmentComment(Base):
    """A comment on one transcript line."""

    __tablename__ = "segment_comments"
    __table_args__ = (
        CheckConstraint("length(text) BETWEEN 1 AND 1000", name="ck_segment_comments_text"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    segment_id: Mapped[int] = mapped_column(
        ForeignKey("transcript_segments.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(String(1000))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now, onupdate=utc_now)

    segment: Mapped["TranscriptSegment"] = relationship(back_populates="comments")
    author: Mapped["User"] = relationship()

    @property
    def author_name(self) -> str:
        return self.author.name


class Soundbite(Base):
    """A titled time range of a meeting that plays on its own."""

    __tablename__ = "soundbites"
    __table_args__ = (
        CheckConstraint("length(title) BETWEEN 1 AND 120", name="ck_soundbites_title"),
        CheckConstraint("start_ms >= 0", name="ck_soundbites_start"),
        # A CHECK can't read the meeting's duration, so the service checks the end against it.
        CheckConstraint("end_ms > start_ms", name="ck_soundbites_range"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(120))
    start_ms: Mapped[int]
    end_ms: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now)

    meeting: Mapped["Meeting"] = relationship(back_populates="soundbites")
