"""SQLAlchemy ORM models, one module per table group.

Importing this package registers every table on Base.metadata (needed before create_all).
"""

from app.models.action_item import ActionItem
from app.models.associations import meeting_participants
from app.models.meeting import Meeting
from app.models.participant import Participant
from app.models.summary import Chapter, Summary
from app.models.transcript import TranscriptSegment
from app.models.user import User

__all__ = [
    "ActionItem",
    "Chapter",
    "Meeting",
    "Participant",
    "Summary",
    "TranscriptSegment",
    "User",
    "meeting_participants",
]
