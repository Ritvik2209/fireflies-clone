"""WebVTT captions: a WEBVTT header, then cues separated by blank lines.

    1
    00:00:01.000 --> 00:00:04.500
    <v Priya Shah>Let's look at the sprint goals.</v>

The speaker comes from a <v Name> voice tag or a "Name:" prefix. NOTE, STYLE and REGION blocks
are skipped; other markup (<b>, <i>, <c.class>, inline timestamps) is removed.
"""

import re

from app.parsers.base import (
    SPEAKER_LINE,
    ParsedSegment,
    TranscriptParseError,
    clean_text,
    parse_timestamp,
)

_TIMING = re.compile(r"^(?P<start>\S+)\s+-->\s+(?P<end>\S+)")
_VOICE = re.compile(r"^<v(?:\.[^\s>]*)?\s+(?P<speaker>[^>]+)>(?P<text>.*)$")
_TAG = re.compile(r"<[^>]+>")
_SKIPPED_BLOCKS = ("NOTE", "STYLE", "REGION", "WEBVTT")
UNKNOWN_SPEAKER = "Unknown speaker"


def parse_vtt(text: str) -> list[ParsedSegment]:
    lines = text.lstrip("﻿").splitlines()
    if not lines or not lines[0].strip().startswith("WEBVTT"):
        raise TranscriptParseError("Not a WebVTT file: the first line must be 'WEBVTT'")

    segments = []
    for first_line_number, block in _blocks(lines):
        if block[0].startswith(_SKIPPED_BLOCKS):
            continue
        segment = _parse_cue(first_line_number, block)
        if segment is not None:
            segments.append(segment)
    if not segments:
        raise TranscriptParseError("No cues found in the WebVTT file")
    return segments


def _blocks(lines: list[str]) -> list[tuple[int, list[str]]]:
    """Group non-blank lines into blocks, remembering each block's first line number."""
    blocks: list[tuple[int, list[str]]] = []
    current: list[str] = []
    for number, line in enumerate(lines, start=1):
        if line.strip():
            if not current:
                blocks.append((number, current))
            current.append(line.strip())
        else:
            current = []
    return blocks


def _parse_cue(first_line_number: int, block: list[str]) -> ParsedSegment | None:
    # The timing line is the first line, or the second when the cue has an identifier.
    timing_index = next((i for i, line in enumerate(block[:2]) if "-->" in line), None)
    if timing_index is None:
        raise TranscriptParseError(
            f"Line {first_line_number}: expected a timing line like '00:00:01.000 --> 00:00:04.000'"
        )
    line_number = first_line_number + timing_index
    timing = _TIMING.match(block[timing_index])
    try:
        if timing is None:
            raise ValueError
        start_ms, end_ms = parse_timestamp(timing["start"]), parse_timestamp(timing["end"])
    except ValueError:
        raise TranscriptParseError(f"Line {line_number}: invalid cue timing") from None
    if end_ms < start_ms:
        raise TranscriptParseError(f"Line {line_number}: the cue ends before it starts")

    payload = " ".join(block[timing_index + 1 :])
    if not payload:
        return None
    speaker, text = _speaker_and_text(payload)
    if not text:
        return None
    return ParsedSegment(speaker, start_ms, end_ms, text)


def _speaker_and_text(payload: str) -> tuple[str, str]:
    voice = _VOICE.match(payload)
    if voice:
        return clean_text(voice["speaker"])[:100], clean_text(_TAG.sub("", voice["text"]))
    plain = clean_text(_TAG.sub("", payload))
    named = SPEAKER_LINE.match(plain)
    if named:
        return named["speaker"].strip(), named["text"]
    return UNKNOWN_SPEAKER, plain
