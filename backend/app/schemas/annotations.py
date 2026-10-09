from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.models.annotations import HighlightColor
from app.schemas.base import ORMModel

CommentText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)
]
SoundbiteTitle = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)
]


class HighlightIn(BaseModel):
    color: HighlightColor


class HighlightOut(ORMModel):
    segment_id: int
    color: HighlightColor


class CommentIn(BaseModel):
    text: CommentText


class CommentOut(ORMModel):
    id: int
    segment_id: int
    author_name: str
    text: str
    created_at: datetime
    updated_at: datetime


class SoundbiteCreate(BaseModel):
    title: SoundbiteTitle
    start_ms: int = Field(ge=0)
    end_ms: int

    @model_validator(mode="after")
    def ends_after_it_starts(self) -> Self:
        if self.end_ms <= self.start_ms:
            raise ValueError("end_ms must be after start_ms")
        return self


class SoundbiteUpdate(BaseModel):
    """PATCH body: a soundbite can be renamed; to change its range, create a new one."""

    title: SoundbiteTitle


class SoundbiteOut(ORMModel):
    id: int
    meeting_id: int
    title: str
    start_ms: int
    end_ms: int
    created_at: datetime
