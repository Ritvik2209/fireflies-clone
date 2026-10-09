from datetime import datetime
from typing import Annotated, Literal, Self

from pydantic import (
    AwareDatetime,
    BaseModel,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from app.models.meeting import MeetingStatus
from app.schemas.action_item import ActionItemOut
from app.schemas.annotations import SoundbiteOut
from app.schemas.base import ORMModel
from app.schemas.participant import ParticipantOut
from app.schemas.summary import ChapterOut, SummaryOut
from app.schemas.tag import TagOut
from app.schemas.transcript import SegmentOut

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
PersonName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
TranscriptFormat = Literal["txt", "vtt", "json"]
MeetingSource = Literal["seed", "upload", "paste"]

MAX_TRANSCRIPT_CHARS = 1_000_000  # about 1 MB of text


class MeetingCreate(BaseModel):
    title: Title
    meeting_date: AwareDatetime  # must include a time zone, e.g. "2026-10-05T09:30:00Z"
    participant_names: list[PersonName] = Field(default_factory=list, max_length=50)
    transcript_text: str = Field(min_length=1, max_length=MAX_TRANSCRIPT_CHARS)
    format: TranscriptFormat
    source: Literal["upload", "paste"]


class MeetingUpdate(BaseModel):
    """PATCH body: only the fields sent change. participant_names and tag_ids replace the list."""

    title: Title | None = None
    participant_names: list[PersonName] | None = Field(default=None, max_length=50)
    tag_ids: list[int] | None = Field(default=None, max_length=50)

    @field_validator("title", "participant_names", "tag_ids")
    @classmethod
    def not_null(cls, value: object) -> object:
        # Runs only for fields that were sent; leaving a field out is fine, sending null is not.
        if value is None:
            raise ValueError("can't be null")
        return value


class MeetingFilters(BaseModel):
    """Query parameters of GET /meetings."""

    q: str | None = Field(default=None, max_length=200, description="Text in the title")
    participant_id: int | None = Field(default=None, ge=1)
    tag_id: int | None = Field(default=None, ge=1)
    date_from: AwareDatetime | None = None
    date_to: AwareDatetime | None = None
    sort: Literal["recent", "oldest"] = "recent"

    @model_validator(mode="after")
    def valid_range(self) -> Self:
        if self.date_from and self.date_to and self.date_from > self.date_to:
            raise ValueError("date_from must not be after date_to")
        return self


class MeetingListItem(ORMModel):
    id: int
    title: str
    meeting_date: datetime
    duration_ms: int
    source: MeetingSource
    participants: list[ParticipantOut]
    tags: list[TagOut]
    status: MeetingStatus  # Extra 3: "processing" until the background job finishes
    error_message: str | None  # why processing failed; None otherwise


class MeetingDetail(MeetingListItem):
    created_at: datetime
    updated_at: datetime
    segments: list[SegmentOut]
    summary: SummaryOut | None
    chapters: list[ChapterOut]
    action_items: list[ActionItemOut]
    soundbites: list[SoundbiteOut]  # bonus 5
