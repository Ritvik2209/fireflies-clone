"""JSON transcripts: [{"speaker": "...", "start": seconds, "end": seconds, "text": "..."}, ...]"""

import json
from typing import Annotated, Self

from pydantic import BaseModel, Field, StringConstraints, ValidationError, model_validator

from app.parsers.base import ParsedSegment, TranscriptParseError, clean_text


class _JsonSegment(BaseModel):
    speaker: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    start: float = Field(ge=0)
    end: float = Field(ge=0)
    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

    @model_validator(mode="after")
    def end_not_before_start(self) -> Self:
        if self.end < self.start:
            raise ValueError("end must not be before start")
        return self


def parse_json(text: str) -> list[ParsedSegment]:
    try:
        data = json.loads(text)
    except json.JSONDecodeError as error:
        raise TranscriptParseError(
            f"Invalid JSON at line {error.lineno}, column {error.colno}: {error.msg}"
        ) from None
    if not isinstance(data, list) or not data:
        raise TranscriptParseError(
            'Expected a non-empty JSON array like [{"speaker", "start", "end", "text"}, ...]'
        )

    segments = []
    for number, item in enumerate(data, start=1):
        try:
            segment = _JsonSegment.model_validate(item)
        except ValidationError as error:
            first = error.errors()[0]
            field = ".".join(str(part) for part in first["loc"])  # empty for whole-item rules
            message = first["msg"].removeprefix("Value error, ")
            prefix = f"Item {number}: {field}" if field else f"Item {number}"
            raise TranscriptParseError(f"{prefix}: {message}") from None
        segments.append(
            ParsedSegment(
                speaker=segment.speaker,
                start_ms=round(segment.start * 1000),
                end_ms=round(segment.end * 1000),
                text=clean_text(segment.text),
            )
        )
    return segments
