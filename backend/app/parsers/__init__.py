"""Transcript parsers (txt, vtt, json); each returns a list of ParsedSegment."""

from app.parsers.base import ParsedSegment, TranscriptParseError
from app.parsers.dispatcher import parse_transcript

__all__ = ["ParsedSegment", "TranscriptParseError", "parse_transcript"]
