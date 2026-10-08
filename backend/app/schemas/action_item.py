from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, StringConstraints, field_validator

from app.schemas.base import ORMModel

ActionText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]


class ActionItemCreate(BaseModel):
    text: ActionText
    assignee_id: int | None = None


class ActionItemUpdate(BaseModel):
    """PATCH body: only the fields sent change. "assignee_id": null unassigns the item."""

    text: ActionText | None = None
    assignee_id: int | None = None
    is_completed: bool | None = None

    @field_validator("text", "is_completed")
    @classmethod
    def not_null(cls, value: object) -> object:
        # Runs only for fields that were sent; leaving a field out is fine, sending null is not.
        if value is None:
            raise ValueError("can't be null")
        return value


class ActionItemOut(ORMModel):
    id: int
    meeting_id: int
    text: str
    assignee_id: int | None
    is_completed: bool
    source_start_ms: int | None
    created_at: datetime
    updated_at: datetime
