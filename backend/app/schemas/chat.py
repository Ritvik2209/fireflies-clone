from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.models.chat import AnsweredBy, ChatRole
from app.schemas.base import ORMModel

MAX_QUESTION_CHARS = 500

Question = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=MAX_QUESTION_CHARS)
]


class ChatQuestion(BaseModel):
    question: Question


class ChatMessageOut(ORMModel):
    id: int
    role: ChatRole
    content: str
    answered_by: AnsweredBy | None  # on answers: "llm", or "fallback" (search results)
    created_at: datetime
