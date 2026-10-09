"""Response model for a meeting's speaker analytics (Extra 2)."""

from app.models.participant import AvatarColor
from app.schemas.base import ORMModel


class SpeakerAnalytics(ORMModel):
    participant_id: int
    name: str
    avatar_color: AvatarColor
    talk_time_ms: int  # the sum of this speaker's line durations
    talk_percent: float  # share of the meeting's talk time, to one decimal
    segment_count: int
    word_count: int
    words_per_minute: int  # 0 when the speaker's talk time is 0
    question_count: int  # lines containing "?"
    longest_monologue_ms: int  # longest run of consecutive lines by this speaker


class MeetingAnalytics(ORMModel):
    meeting_id: int
    total_talk_time_ms: int
    speaker_count: int
    dominant_speaker: str | None  # the name of whoever talked longest; None without a transcript
    speakers: list[SpeakerAnalytics]  # most talk time first
