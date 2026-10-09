"""Many-to-many link tables (no model class of their own: they only hold two foreign keys)."""

from sqlalchemy import Column, ForeignKey, Table

from app.database import Base

# A meeting has many participants and a person attends many meetings. The composite primary key
# stops the same link existing twice and serves lookups by meeting_id; the participant_id index
# serves "meetings with this person".
meeting_participants = Table(
    "meeting_participants",
    Base.metadata,
    Column("meeting_id", ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "participant_id",
        ForeignKey("participants.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    ),
)

# Meetings ↔ tags (bonus 2), the same shape: the tag_id index serves "meetings with this tag".
meeting_tags = Table(
    "meeting_tags",
    Base.metadata,
    Column("meeting_id", ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True, index=True),
)
