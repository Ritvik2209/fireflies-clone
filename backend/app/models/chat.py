"""The "Ask about this meeting" chat history (bonus 6): questions and answers, per meeting."""

from datetime import datetime
from typing import TYPE_CHECKING, Literal

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.types import UTCDateTime, utc_now

if TYPE_CHECKING:
    from app.models.meeting import Meeting

ChatRole = Literal["user", "assistant"]
AnsweredBy = Literal["llm", "fallback"]  # the model answered, or search results did


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = (
        CheckConstraint("role IN ('user', 'assistant')", name="ck_chat_messages_role"),
        CheckConstraint(
            "answered_by IS NULL OR answered_by IN ('llm', 'fallback')",
            name="ck_chat_messages_answered_by",
        ),
        CheckConstraint("length(content) >= 1", name="ck_chat_messages_content"),
        # Loads a meeting's history in order, and counts its recent questions (the rate limit).
        Index("ix_chat_messages_meeting_created", "meeting_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(10))
    content: Mapped[str] = mapped_column(Text)
    answered_by: Mapped[str | None] = mapped_column(String(10))  # set on answers only
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now)

    meeting: Mapped["Meeting"] = relationship(back_populates="chat_messages")
