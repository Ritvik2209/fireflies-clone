"""A meeting: the centre of the schema. Everything that exists only inside one meeting cascades."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.associations import meeting_participants, meeting_tags
from app.models.types import UTCDateTime, utc_now

if TYPE_CHECKING:
    from app.models.action_item import ActionItem
    from app.models.annotations import Soundbite
    from app.models.chat import ChatMessage
    from app.models.participant import Participant
    from app.models.summary import Chapter, Summary
    from app.models.tag import Tag
    from app.models.transcript import TranscriptSegment
    from app.models.user import User


class Meeting(Base):
    __tablename__ = "meetings"
    __table_args__ = (
        CheckConstraint("length(title) BETWEEN 1 AND 200", name="ck_meetings_title_length"),
        CheckConstraint("duration_ms >= 0", name="ck_meetings_duration"),
        CheckConstraint("source IN ('seed', 'upload', 'paste')", name="ck_meetings_source"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    meeting_date: Mapped[datetime] = mapped_column(UTCDateTime, index=True)
    duration_ms: Mapped[int]
    source: Mapped[str] = mapped_column(String(10))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now, onupdate=utc_now)

    owner: Mapped["User"] = relationship(back_populates="meetings")
    # Shared people: only the link rows are deleted with a meeting, never the participants.
    participants: Mapped[list["Participant"]] = relationship(
        secondary=meeting_participants, back_populates="meetings", order_by="Participant.name"
    )
    # Shared labels (bonus 2): like participants, only the link rows go with a meeting.
    tags: Mapped[list["Tag"]] = relationship(
        secondary=meeting_tags, back_populates="meetings", order_by="Tag.name"
    )
    # Owned children: the ORM deletes them with the meeting (and removes orphans), and the
    # foreign keys' ON DELETE CASCADE does the same for deletes that bypass the ORM.
    segments: Mapped[list["TranscriptSegment"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="TranscriptSegment.position",
    )
    summary: Mapped["Summary | None"] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", uselist=False
    )
    chapters: Mapped[list["Chapter"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="Chapter.position"
    )
    action_items: Mapped[list["ActionItem"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="ActionItem.id"
    )
    soundbites: Mapped[list["Soundbite"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="Soundbite.start_ms"
    )
    chat_messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="ChatMessage.id"
    )
