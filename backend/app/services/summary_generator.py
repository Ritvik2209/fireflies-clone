"""Rule-based meeting notes (overview, keywords, action items, chapters) without an LLM.

A pure function: transcript segments in, notes out. It never touches the database, which makes
it deterministic and easy to unit-test.
"""

import re
from collections import Counter
from collections.abc import Iterator, Sequence
from dataclasses import dataclass

from app.models.summary import GeneratedBy
from app.parsers.base import ParsedSegment

OVERVIEW_SENTENCES = 3
MIN_SENTENCE_WORDS = 8
MIN_CONTENT_WORDS = 3
KEYWORD_COUNT = 6
CHAPTER_WINDOW_MS = 5 * 60 * 1000
CHAPTER_TITLE_TERMS = 3
MAX_ACTION_ITEMS = 8


@dataclass(frozen=True)
class NoteChapter:
    title: str
    start_ms: int


@dataclass(frozen=True)
class NoteActionItem:
    text: str
    assignee: str | None  # a speaker's name, resolved to a participant when the meeting is saved
    start_ms: int | None
    is_completed: bool = False


@dataclass(frozen=True)
class MeetingNotes:
    """Notes in a storage-independent shape, used for generated and hand-written (seed) notes."""

    overview: str
    keywords: list[str]
    chapters: list[NoteChapter]
    action_items: list[NoteActionItem]
    generated_by: GeneratedBy


# Common English words, conversational filler and words every meeting uses. Hand-written on
# purpose: easy to read and tune, and no NLP library needed.
STOPWORDS = frozenset(
    """
    a about above actually after again against agenda ago ahead all almost along already also
    although always am among an and another any anyone anything anyway are aren't around as ask
    asked at away back be because been before being below best better between big bit both but
    by call called calls can can't cannot case come comes coming could couldn't day days did
    didn't do does doesn't doing don't done down during each else end enough even ever every
    everybody everyone everything exactly fine first five folks follow follow-up for four from
    get gets getting give go goes going gonna good got great guess guys had hadn't happy has
    hasn't have haven't having he he'd he'll he's hear hello her here hey hi him his hmm hour
    hours how i i'd i'll i'm i've if in into is isn't it it's its join joining just keep kind
    know last least let let's like little long look looking lot lots made make makes making many
    may maybe me mean meeting meetings might minute minutes more most much must my need needs
    never new next nice no not nothing now of off oh ok okay on once one only or other our ours
    out over own part people perfect point points pretty probably put question questions quick
    quite rather really right said same say saying says second see seem seems she should
    shouldn't since so some something sometimes sorry sort sound sounds start started still
    such sure take talk talked talking team tell than thank thanks that that's the their them
    then there there's these they they'd they'll they're thing things think thinking third this
    those though thought three through time to today together too totally try trying two uh um
    under until up us use used very via want wanted wants was wasn't way we we'd we'll we're
    we've week weeks well went were weren't what what's when where which while who whole why
    will with won't work would wouldn't yeah year yes yet you you'd you'll you're you've your
    yours
    """.split()
)

_WORD = re.compile(r"[a-z][a-z'-]*[a-z]")
_SENTENCE_BREAK = re.compile(r"(?<=[.!?])\s+")
_ACTION = re.compile(
    r"\b(?:i|we|you|they|he|she)(?:'ll|\s+will)\b"  # a person committing: "I'll", "we will"
    r"|\bneeds?\s+to\b"
    r"|\blet's\b"
    r"|\bfollow[\s-]?up\b"
    r"|\baction\s+items?\b"
    r"|\bby\s+(?:monday|tuesday|wednesday|thursday|friday|tomorrow|eod"
    r"|end\s+of\s+(?:the\s+)?(?:day|week)|next\s+week)\b",
    re.IGNORECASE,
)


def generate_notes(segments: Sequence[ParsedSegment]) -> MeetingNotes:
    ordered = sorted(segments, key=lambda segment: segment.start_ms)
    names = {part.lower() for segment in ordered for part in segment.speaker.split()}
    return MeetingNotes(
        overview=_overview(ordered, names),
        keywords=_top_terms(ordered, names, KEYWORD_COUNT),
        chapters=_chapters(ordered, names),
        action_items=_action_items(ordered, names),
        generated_by="rule_based",
    )


def _overview(segments: Sequence[ParsedSegment], names: set[str]) -> str:
    """The first few substantial statements, which usually set out what the meeting is about."""
    chosen = [sentence for _, sentence in _substantial_sentences(segments, names)]
    return " ".join(chosen[:OVERVIEW_SENTENCES])


def _top_terms(segments: Sequence[ParsedSegment], names: set[str], count: int) -> list[str]:
    counts = Counter(word for segment in segments for word in _content_words(segment.text, names))
    return [word for word, _ in counts.most_common(count)]


def _action_items(segments: Sequence[ParsedSegment], names: set[str]) -> list[NoteActionItem]:
    items: list[NoteActionItem] = []
    seen: set[str] = set()
    for segment in segments:
        for sentence in _sentences(segment.text):
            is_commitment = _ACTION.search(sentence) and not sentence.endswith("?")
            # Skip pleasantries such as "Let's get started." (too few content words).
            if not is_commitment or len(_content_words(sentence, names)) < 2:
                continue
            if sentence.lower() in seen:
                continue
            seen.add(sentence.lower())
            items.append(NoteActionItem(sentence[:500], segment.speaker, segment.start_ms))
            if len(items) == MAX_ACTION_ITEMS:
                return items
    return items


def _chapters(segments: Sequence[ParsedSegment], names: set[str]) -> list[NoteChapter]:
    """One chapter per ~5-minute window, titled with that window's most frequent terms."""
    windows: dict[int, list[ParsedSegment]] = {}
    for segment in segments:
        windows.setdefault(segment.start_ms // CHAPTER_WINDOW_MS, []).append(segment)
    return [
        NoteChapter(
            title=_title(_top_terms(window, names, CHAPTER_TITLE_TERMS)),
            start_ms=window[0].start_ms,
        )
        for _, window in sorted(windows.items())
    ]


def _title(terms: list[str]) -> str:
    """['pricing', 'discounts', 'renewal'] → 'Pricing, discounts and renewal'."""
    if not terms:
        return "Discussion"
    if len(terms) == 1:
        return terms[0].capitalize()
    return f"{', '.join(terms[:-1])} and {terms[-1]}".capitalize()


def _substantial_sentences(
    segments: Sequence[ParsedSegment], names: set[str]
) -> Iterator[tuple[ParsedSegment, str]]:
    for segment in segments:
        for sentence in _sentences(segment.text):
            long_enough = len(sentence.split()) >= MIN_SENTENCE_WORDS
            meaningful = len(_content_words(sentence, names)) >= MIN_CONTENT_WORDS
            if long_enough and meaningful and not sentence.endswith("?"):
                yield segment, sentence


def _sentences(text: str) -> list[str]:
    return [sentence.strip() for sentence in _SENTENCE_BREAK.split(text) if sentence.strip()]


def _content_words(text: str, names: set[str]) -> list[str]:
    """Lower-cased words worth counting: no stopwords, speakers' names or very short words."""
    words = []
    for word in _WORD.findall(text.lower().replace("’", "'")):
        word = word.removesuffix("'s")
        if len(word) >= 3 and word not in STOPWORDS and word not in names:
            words.append(word)
    return words
