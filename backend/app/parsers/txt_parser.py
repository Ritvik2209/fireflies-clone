"""Plain-text transcripts, one utterance per line.

    [00:01:23] Priya Shah: Let's look at the sprint goals.   timestamps as [HH:MM:SS] or [MM:SS]
    Priya Shah: Let's look at the sprint goals.              no timestamps: times are estimated

A line that doesn't start a new utterance continues the previous one (wrapped text).
"""

import re
from dataclasses import dataclass, field

from app.parsers.base import (
    SPEAKER_LINE,
    ParsedSegment,
    TranscriptParseError,
    clean_text,
    estimated_duration_ms,
    parse_timestamp,
)

_TIMESTAMPED = re.compile(r"^\[(?P<time>[^\]]*)\]\s*(?P<rest>.*)$")
_EXPECTED = "expected '[HH:MM:SS] Speaker Name: text' or 'Speaker Name: text'"


@dataclass
class _Utterance:
    speaker: str
    start_ms: int | None
    parts: list[str] = field(default_factory=list)

    @property
    def text(self) -> str:
        return clean_text(" ".join(self.parts))


def parse_txt(text: str) -> list[ParsedSegment]:
    lines = [
        (number, line.strip())
        for number, line in enumerate(text.lstrip("﻿").splitlines(), start=1)
        if line.strip()
    ]
    if not lines:
        raise TranscriptParseError("The transcript is empty")

    # The first line decides the mode: either every utterance has a timestamp or none does.
    timed = _TIMESTAMPED.match(lines[0][1]) is not None
    utterances: list[_Utterance] = []
    for number, line in lines:
        utterance = _parse_timed_line(number, line) if timed else _parse_untimed_line(line)
        if utterance is not None:
            utterances.append(utterance)
        elif utterances:
            utterances[-1].parts.append(line)
        else:
            raise TranscriptParseError(f"Line {number}: {_EXPECTED}")

    return _timed_segments(utterances) if timed else _estimated_segments(utterances)


def _parse_timed_line(number: int, line: str) -> _Utterance | None:
    """A new utterance, or None for a continuation line."""
    match = _TIMESTAMPED.match(line)
    if match is None:
        if SPEAKER_LINE.match(line):
            raise TranscriptParseError(
                f"Line {number}: missing timestamp (the other lines have one)"
            )
        return None
    try:
        start_ms = parse_timestamp(match["time"])
    except ValueError:
        raise TranscriptParseError(
            f"Line {number}: invalid timestamp [{match['time']}], expected [HH:MM:SS] or [MM:SS]"
        ) from None
    speaker = SPEAKER_LINE.match(match["rest"])
    if speaker is None:
        raise TranscriptParseError(f"Line {number}: {_EXPECTED}")
    return _Utterance(speaker["speaker"].strip(), start_ms, [speaker["text"]])


def _parse_untimed_line(line: str) -> _Utterance | None:
    speaker = SPEAKER_LINE.match(line)
    if speaker is None:
        return None
    return _Utterance(speaker["speaker"].strip(), None, [speaker["text"]])


def _timed_segments(utterances: list[_Utterance]) -> list[ParsedSegment]:
    """Each utterance lasts until the next one starts; the last lasts as long as its words."""
    segments = []
    for index, utterance in enumerate(utterances):
        start = utterance.start_ms or 0
        if index + 1 < len(utterances):
            end = max(start, utterances[index + 1].start_ms or 0)
        else:
            end = start + estimated_duration_ms(utterance.text)
        segments.append(ParsedSegment(utterance.speaker, start, end, utterance.text))
    return segments


def _estimated_segments(utterances: list[_Utterance]) -> list[ParsedSegment]:
    """No timestamps: lay utterances end to end, each as long as its words take to say."""
    segments, cursor = [], 0
    for utterance in utterances:
        end = cursor + estimated_duration_ms(utterance.text)
        segments.append(ParsedSegment(utterance.speaker, cursor, end, utterance.text))
        cursor = end
    return segments
