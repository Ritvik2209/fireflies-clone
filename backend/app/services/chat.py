"""The "Ask about this meeting" chat (bonus 6): history, rate limit, context, LLM or fallback."""

import logging
from datetime import timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.errors import TooManyRequestsError
from app.llm import client as llm
from app.llm.prompts import build_messages
from app.models import ChatMessage, Meeting, TranscriptSegment, User
from app.models.types import utc_now
from app.services.export import timestamp
from app.services.meetings import get_meeting, get_owned_meeting
from app.services.search import relevant_segment_ids

QUESTIONS_PER_MINUTE = 10  # per meeting, counted from the stored questions
CONTEXT_BUDGET_CHARS = 16_000  # about 4,000 tokens; Groq's free plan allows 8,000 a minute
RELEVANT_LINES = 12  # if the transcript is longer: its best matches…
NEIGHBOURS = 1  # …plus the line before and after each, for context
HISTORY_MESSAGES = 6  # recent turns sent along, so follow-up questions work
FALLBACK_MOMENTS = 4

logger = logging.getLogger(__name__)


def list_messages(db: Session, owner: User, meeting_id: int) -> list[ChatMessage]:
    return list(get_owned_meeting(db, owner, meeting_id).chat_messages)


def clear_history(db: Session, owner: User, meeting_id: int) -> None:
    meeting = get_owned_meeting(db, owner, meeting_id)
    db.execute(delete(ChatMessage).where(ChatMessage.meeting_id == meeting.id))
    db.commit()


def ask(db: Session, owner: User, meeting_id: int, question: str) -> ChatMessage:
    """Answers a question about the meeting, from the LLM or, failing that, from search."""
    meeting = get_meeting(db, owner, meeting_id)
    _check_rate_limit(db, meeting.id)
    history = [(message.role, message.content) for message in meeting.chat_messages]
    overview = meeting.summary.overview if meeting.summary else ""
    try:
        messages = build_messages(
            meeting.title,
            overview,
            _context_lines(db, meeting, question),
            history[-HISTORY_MESSAGES:],
            question,
        )
        answer, answered_by = llm.complete(messages), "llm"
    except llm.LLMUnavailable as error:  # no key, or the provider failed: the demo still answers
        logger.warning("Chat answered from search because the LLM is unavailable: %s", error)
        answer, answered_by = _relevant_moments(db, meeting, question), "fallback"

    db.add(ChatMessage(meeting_id=meeting.id, user_id=owner.id, role="user", content=question))
    reply = ChatMessage(
        meeting_id=meeting.id,
        user_id=owner.id,
        role="assistant",
        content=answer,
        answered_by=answered_by,
    )
    db.add(reply)
    db.commit()  # the question and its answer are stored together, or not at all
    return reply


def _check_rate_limit(db: Session, meeting_id: int) -> None:
    since = utc_now() - timedelta(minutes=1)
    asked = db.scalar(
        select(func.count())
        .select_from(ChatMessage)
        .where(
            ChatMessage.meeting_id == meeting_id,
            ChatMessage.role == "user",
            ChatMessage.created_at >= since,
        )
    )
    if asked is not None and asked >= QUESTIONS_PER_MINUTE:
        raise TooManyRequestsError("Too many questions about this meeting: wait a minute")


def _line(segment: TranscriptSegment, names: dict[int, str]) -> str:
    """A transcript line as the model sees it: "[04:05] Priya Shah: text"."""
    return f"[{timestamp(segment.start_ms)}] {names[segment.speaker_id]}: {segment.text}"


def _context_lines(db: Session, meeting: Meeting, question: str) -> list[str]:
    """The whole transcript if it fits the budget, otherwise its parts relevant to the question."""
    names = {person.id: person.name for person in meeting.participants}
    lines = [_line(segment, names) for segment in meeting.segments]
    if sum(len(line) + 1 for line in lines) <= CONTEXT_BUDGET_CHARS:
        return lines
    position = {segment.id: index for index, segment in enumerate(meeting.segments)}
    keep: set[int] = set()
    for segment_id in relevant_segment_ids(db, meeting.id, question, RELEVANT_LINES):
        index = position[segment_id]
        keep.update(range(max(0, index - NEIGHBOURS), min(len(lines), index + NEIGHBOURS + 1)))
    if not keep:  # nothing matched: the opening of the meeting is the best guess
        keep = set(range(min(len(lines), RELEVANT_LINES)))
    return [lines[index] for index in sorted(keep)]  # back in time order


def _relevant_moments(db: Session, meeting: Meeting, question: str) -> str:
    """The fallback answer: the best-matching lines, as "[mm:ss] Speaker: text"."""
    names = {person.id: person.name for person in meeting.participants}
    by_id = {segment.id: segment for segment in meeting.segments}
    ids = relevant_segment_ids(db, meeting.id, question, FALLBACK_MOMENTS)
    if not ids:
        # Search needs matching words; a general question ("what was decided?") gets the overview.
        overview = meeting.summary.overview if meeting.summary else ""
        no_match = "No line of the transcript matches those words."
        if overview:
            return f"{no_match} The meeting's overview:\n{overview}"
        return f"{no_match} Try other words."
    moments = "\n".join(f"- {_line(by_id[segment_id], names)}" for segment_id in ids)
    return f"Relevant moments from the transcript:\n{moments}"
