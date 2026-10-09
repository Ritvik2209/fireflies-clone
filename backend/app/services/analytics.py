"""Speaker analytics (Extra 2): who talked how much, computed from the transcript on every read.

Totals (time, line and question counts) are added up by the database with GROUP BY. Words and
monologues are counted in Python, because they need text splitting and the lines in order.
"""

from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

from sqlalchemy import Row, case, func, select
from sqlalchemy.orm import Session

from app.models import Participant, TranscriptSegment, User
from app.services.meetings import get_owned_meeting


@dataclass(frozen=True)
class SpeakerStats:
    participant_id: int
    name: str
    avatar_color: str
    talk_time_ms: int
    talk_percent: float
    segment_count: int
    word_count: int
    words_per_minute: int
    question_count: int
    longest_monologue_ms: int


@dataclass(frozen=True)
class MeetingStats:
    meeting_id: int
    total_talk_time_ms: int
    speaker_count: int
    dominant_speaker: str | None
    speakers: list[SpeakerStats]


def meeting_analytics(db: Session, owner: User, meeting_id: int) -> MeetingStats:
    meeting = get_owned_meeting(db, owner, meeting_id)  # 404 if missing or someone else's
    totals = _totals_by_speaker(db, meeting.id)
    words, longest = _words_and_monologues(db, meeting.id)
    total_ms = sum(row.talk_time_ms for row in totals)
    speakers = [
        SpeakerStats(
            participant_id=row.speaker_id,
            name=row.name,
            avatar_color=row.avatar_color,
            talk_time_ms=row.talk_time_ms,
            talk_percent=round(row.talk_time_ms * 100 / total_ms, 1) if total_ms else 0.0,
            segment_count=row.segment_count,
            word_count=words[row.speaker_id],
            words_per_minute=_per_minute(words[row.speaker_id], row.talk_time_ms),
            question_count=row.question_count,
            longest_monologue_ms=longest[row.speaker_id],
        )
        for row in totals
    ]
    speakers.sort(key=lambda speaker: (-speaker.talk_time_ms, speaker.name))
    return MeetingStats(
        meeting_id=meeting.id,
        total_talk_time_ms=total_ms,
        speaker_count=len(speakers),
        dominant_speaker=speakers[0].name if speakers else None,
        speakers=speakers,
    )


def _totals_by_speaker(db: Session, meeting_id: int) -> Sequence[Row[Any]]:
    """One row per speaker, summed by the database: talk time, lines and questions."""
    duration = TranscriptSegment.end_ms - TranscriptSegment.start_ms
    is_question = case((TranscriptSegment.text.contains("?"), 1), else_=0)
    query = (
        select(
            TranscriptSegment.speaker_id,
            Participant.name,
            Participant.avatar_color,
            func.sum(duration).label("talk_time_ms"),
            func.count().label("segment_count"),
            func.sum(is_question).label("question_count"),
        )
        .join(Participant, Participant.id == TranscriptSegment.speaker_id)
        .where(TranscriptSegment.meeting_id == meeting_id)
        .group_by(TranscriptSegment.speaker_id, Participant.name, Participant.avatar_color)
    )
    return db.execute(query).all()


def _words_and_monologues(db: Session, meeting_id: int) -> tuple[Counter[int], Counter[int]]:
    """Each speaker's word count and longest turn, walking the lines in transcript order.

    A turn is a run of consecutive lines by one speaker. It lasts from its first line's start to
    its last line's end, so pauses inside it count: nobody else spoke during them.
    """
    lines = db.execute(
        select(
            TranscriptSegment.speaker_id,
            TranscriptSegment.start_ms,
            TranscriptSegment.end_ms,
            TranscriptSegment.text,
        )
        .where(TranscriptSegment.meeting_id == meeting_id)
        .order_by(TranscriptSegment.position)
    ).all()
    words: Counter[int] = Counter()
    longest: Counter[int] = Counter()
    speaker, turn_start, turn_end = None, 0, 0
    for line in lines:
        words[line.speaker_id] += len(line.text.split())
        if line.speaker_id != speaker:  # someone else speaks: a new turn starts
            speaker, turn_start, turn_end = line.speaker_id, line.start_ms, line.end_ms
        else:
            turn_end = max(turn_end, line.end_ms)
        longest[speaker] = max(longest[speaker], turn_end - turn_start)
    return words, longest


def _per_minute(word_count: int, talk_time_ms: int) -> int:
    """Words per minute of talk; 0 for a speaker whose lines have no duration."""
    return round(word_count * 60_000 / talk_time_ms) if talk_time_ms else 0
