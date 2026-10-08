"""One utterance of a meeting's transcript. Times are integer milliseconds from its start."""

from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.meeting import Meeting
    from app.models.participant import Participant


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    __table_args__ = (
        # Also the index that loads a transcript in order (WHERE meeting_id = ? ORDER BY position).
        UniqueConstraint("meeting_id", "position", name="uq_segments_meeting_position"),
        CheckConstraint("position >= 0", name="ck_segments_position"),
        CheckConstraint("start_ms >= 0", name="ck_segments_start"),
        CheckConstraint("end_ms >= start_ms", name="ck_segments_end_after_start"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    speaker_id: Mapped[int] = mapped_column(ForeignKey("participants.id", ondelete="RESTRICT"))
    position: Mapped[int]
    start_ms: Mapped[int]
    end_ms: Mapped[int]
    text: Mapped[str] = mapped_column(Text)

    meeting: Mapped["Meeting"] = relationship(back_populates="segments")
    speaker: Mapped["Participant"] = relationship(back_populates="segments")
