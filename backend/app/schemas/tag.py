from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.models.tag import TagColor
from app.schemas.base import ORMModel

TagName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]


class TagCreate(BaseModel):
    name: TagName
    color: TagColor | None = None  # left out: picked from the name, so it's always the same


class TagOut(ORMModel):
    id: int
    name: str
    color: TagColor
