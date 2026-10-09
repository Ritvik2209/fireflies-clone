"""/api/meetings/{id}/chat (bonus 6): ask questions about a meeting. HTTP concerns only."""

from fastapi import APIRouter

from app.dependencies import CurrentUser, DbSession
from app.models import ChatMessage
from app.schemas.base import ERROR_RESPONSES
from app.schemas.chat import ChatMessageOut, ChatQuestion
from app.services import chat as service

router = APIRouter(prefix="/meetings", tags=["chat"], responses=ERROR_RESPONSES)


@router.get("/{meeting_id}/chat", response_model=list[ChatMessageOut])
def list_messages(meeting_id: int, db: DbSession, user: CurrentUser) -> list[ChatMessage]:
    return service.list_messages(db, user, meeting_id)


@router.post(
    "/{meeting_id}/chat",
    response_model=ChatMessageOut,
    status_code=201,
    responses={429: {"description": "Too many questions about this meeting in a minute"}},
)
def ask(meeting_id: int, data: ChatQuestion, db: DbSession, user: CurrentUser) -> ChatMessage:
    """Answers the question. Returns the stored answer; the question is stored with it."""
    return service.ask(db, user, meeting_id, data.question)


@router.delete("/{meeting_id}/chat", status_code=204)
def clear(meeting_id: int, db: DbSession, user: CurrentUser) -> None:
    service.clear_history(db, user, meeting_id)
