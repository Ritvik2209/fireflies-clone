"""Picks the parser for a transcript format. Adding a format = one function + one entry here."""

from collections.abc import Callable

from app.parsers.base import ParsedSegment, TranscriptParseError
from app.parsers.json_parser import parse_json
from app.parsers.txt_parser import parse_txt
from app.parsers.vtt_parser import parse_vtt

PARSERS: dict[str, Callable[[str], list[ParsedSegment]]] = {
    "txt": parse_txt,
    "vtt": parse_vtt,
    "json": parse_json,
}


def parse_transcript(text: str, transcript_format: str) -> list[ParsedSegment]:
    parser = PARSERS.get(transcript_format)
    if parser is None:
        raise TranscriptParseError(
            f"Unsupported transcript format {transcript_format!r}: use txt, vtt or json"
        )
    return parser(text)
