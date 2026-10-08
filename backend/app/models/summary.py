"""A meeting's generated (or hand-written) notes: the summary and its chapter outline."""

from datetime import datetime
from typing import TYPE_CHECKING, Literal, get_args

from sqlalchemy import JSON, CheckConstraint, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.types import UTCDateTime, utc_now

if TYPE_CHECKING:
    from app.models.meeting import Meeting

# Who wrote the notes: hand-written seed data, or the rule-based generator.
GeneratedBy = Literal["seed", "rule_based"]


class Summary(Base):
    """One-to-one with a meeting: the UNIQUE meeting_id allows at most one summary each."""

    __tablename__ = "summaries"
    __table_args__ = (
        CheckConstraint(
            f"generated_by IN ({', '.join(repr(value) for value in get_args(GeneratedBy))})",
            name="ck_summaries_generated_by",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), unique=True
    )
    overview: Mapped[str] = mapped_column(Text)
    # A JSON list stored as text: display-only, never filtered or joined on, so no extra table.
    keywords: Mapped[list[str]] = mapped_column(JSON)
    generated_by: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now)

    meeting: Mapped["Meeting"] = relationship(back_populates="summary")


class Chapter(Base):
    __tablename__ = "chapters"
    __table_args__ = (
        UniqueConstraint("meeting_id", "position", name="uq_chapters_meeting_position"),
        CheckConstraint("start_ms >= 0", name="ck_chapters_start"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    start_ms: Mapped[int]
    position: Mapped[int]

    meeting: Mapped["Meeting"] = relationship(back_populates="chapters")
