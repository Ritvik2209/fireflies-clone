"""Pieces shared by the transcript parsers: the common output type, errors and time helpers."""

import re
from dataclasses import dataclass

from app.errors import InvalidInputError

WORDS_PER_MINUTE = 150
MIN_UTTERANCE_MS = 1_000


@dataclass(frozen=True)
class ParsedSegment:
    """One utterance. Every parser returns a list of these, whatever the input format."""

    speaker: str
    start_ms: int
    end_ms: int
    text: str


class TranscriptParseError(InvalidInputError):
    """The transcript can't be parsed; the client gets a 422 with this message."""


# "Name: text" where the name starts with a letter and is at most 60 characters long.
SPEAKER_LINE = re.compile(r"^(?P<speaker>[^\W\d_][\w .'’-]{0,59}?)\s*:\s*(?P<text>\S.*)$")

_TIMESTAMP = re.compile(
    r"^(?:(?P<h>\d{1,2}):)?(?P<m>\d{1,2}):(?P<s>\d{2})(?:[.,](?P<ms>\d{1,3}))?$"
)


def parse_timestamp(value: str) -> int:
    """'01:02:03', '02:03' or '00:01:02.500' → milliseconds. Raises ValueError if malformed."""
    match = _TIMESTAMP.match(value.strip())
    if match is None:
        raise ValueError(f"invalid timestamp {value!r}")
    hours, minutes, seconds = int(match["h"] or 0), int(match["m"]), int(match["s"])
    if minutes > 59 or seconds > 59:
        raise ValueError(f"invalid timestamp {value!r}")
    millis = int(match["ms"].ljust(3, "0")) if match["ms"] else 0
    return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis


def estimated_duration_ms(text: str) -> int:
    """How long `text` takes to say at ~150 words per minute (at least one second)."""
    return max(MIN_UTTERANCE_MS, round(len(text.split()) / WORDS_PER_MINUTE * 60_000))


def clean_text(text: str) -> str:
    """Collapse runs of whitespace (including line breaks) into single spaces."""
    return " ".join(text.split())
