from datetime import datetime

from pydantic import BaseModel, Field

from app.models.participant import AvatarColor


class SearchResult(BaseModel):
    """One transcript line that matches a global search (bonus 4)."""

    segment_id: int
    meeting_id: int
    meeting_title: str
    meeting_date: datetime
    speaker_name: str
    speaker_color: AvatarColor
    start_ms: int
    snippet: str = Field(description="Text around the match; matches are wrapped in \\x02 … \\x03")
