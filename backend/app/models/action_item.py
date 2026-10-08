"""A task from a meeting, optionally assigned to one of its participants."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.types import UTCDateTime, utc_now

if TYPE_CHECKING:
    from app.models.meeting import Meeting
    from app.models.participant import Participant


class ActionItem(Base):
    __tablename__ = "action_items"
    __table_args__ = (
        CheckConstraint("length(text) BETWEEN 1 AND 500", name="ck_action_items_text_length"),
        Index("ix_action_items_meeting_completed", "meeting_id", "is_completed"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(String(500))
    # SET NULL: losing the assignee leaves the task unassigned instead of deleting it.
    assignee_id: Mapped[int | None] = mapped_column(
        ForeignKey("participants.id", ondelete="SET NULL")
    )
    is_completed: Mapped[bool] = mapped_column(default=False)
    # The transcript moment the task came from; clicking it seeks the player.
    source_start_ms: Mapped[int | None]
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now, onupdate=utc_now)

    meeting: Mapped["Meeting"] = relationship(back_populates="action_items")
    assignee: Mapped["Participant | None"] = relationship(back_populates="action_items")
