"""SQLAlchemy ORM models, one module per table group.

Importing this package registers every table on Base.metadata (needed before create_all).
"""

from app.models.action_item import ActionItem
from app.models.annotations import Highlight, SegmentComment, Soundbite
from app.models.associations import meeting_participants, meeting_tags
from app.models.chat import ChatMessage
from app.models.meeting import Meeting
from app.models.participant import Participant
from app.models.summary import Chapter, Summary
from app.models.tag import Tag
from app.models.transcript import TranscriptSegment
from app.models.user import User

__all__ = [
    "ActionItem",
    "Chapter",
    "ChatMessage",
    "Highlight",
    "Meeting",
    "Participant",
    "SegmentComment",
    "Soundbite",
    "Summary",
    "Tag",
    "TranscriptSegment",
    "User",
    "meeting_participants",
    "meeting_tags",
]
