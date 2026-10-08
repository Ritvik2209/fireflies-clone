"""A person who appears in meetings: one shared directory, linked to meetings many-to-many."""

from typing import TYPE_CHECKING, Literal, get_args

from sqlalchemy import CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.associations import meeting_participants

if TYPE_CHECKING:
    from app.models.action_item import ActionItem
    from app.models.meeting import Meeting
    from app.models.transcript import TranscriptSegment

# Palette keys for initials avatars; the frontend maps each key to a colour.
AvatarColor = Literal["indigo", "green", "yellow", "orange", "pink", "cyan"]
AVATAR_COLORS: tuple[str, ...] = get_args(AvatarColor)


class Participant(Base):
    __tablename__ = "participants"
    __table_args__ = (
        CheckConstraint(
            f"avatar_color IN ({', '.join(repr(color) for color in AVATAR_COLORS)})",
            name="ck_participants_avatar_color",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # NOCASE: "priya shah" equals "Priya Shah", and the index on name can still be used.
    name: Mapped[str] = mapped_column(String(100, collation="NOCASE"), index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    avatar_color: Mapped[str] = mapped_column(String(10))

    meetings: Mapped[list["Meeting"]] = relationship(
        secondary=meeting_participants, back_populates="participants"
    )
    # passive_deletes="all": the ORM never touches a speaker's lines; the database's RESTRICT
    # refuses to delete a participant who spoke.
    segments: Mapped[list["TranscriptSegment"]] = relationship(
        back_populates="speaker", passive_deletes="all"
    )
    # Deleting an assignee leaves the task unassigned (ON DELETE SET NULL in the database).
    action_items: Mapped[list["ActionItem"]] = relationship(
        back_populates="assignee", passive_deletes=True
    )
