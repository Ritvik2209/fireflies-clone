"""Highlights, comments and soundbites (bonus 5). HTTP concerns only."""

from fastapi import APIRouter

from app.dependencies import CurrentUser, DbSession
from app.models import Highlight, SegmentComment, Soundbite
from app.schemas.annotations import (
    CommentIn,
    CommentOut,
    HighlightIn,
    HighlightOut,
    SoundbiteCreate,
    SoundbiteOut,
    SoundbiteUpdate,
)
from app.schemas.base import ERROR_RESPONSES
from app.services import annotations as service

router = APIRouter(tags=["annotations"], responses=ERROR_RESPONSES)


@router.put("/segments/{segment_id}/highlight", response_model=HighlightOut)
def set_highlight(
    segment_id: int, data: HighlightIn, db: DbSession, user: CurrentUser
) -> Highlight:
    return service.set_highlight(db, user, segment_id, data.color)


@router.delete("/segments/{segment_id}/highlight", status_code=204)
def clear_highlight(segment_id: int, db: DbSession, user: CurrentUser) -> None:
    service.clear_highlight(db, user, segment_id)


@router.get("/segments/{segment_id}/comments", response_model=list[CommentOut])
def list_comments(segment_id: int, db: DbSession, user: CurrentUser) -> list[SegmentComment]:
    return service.list_comments(db, user, segment_id)


@router.post("/segments/{segment_id}/comments", response_model=CommentOut, status_code=201)
def add_comment(
    segment_id: int, data: CommentIn, db: DbSession, user: CurrentUser
) -> SegmentComment:
    return service.add_comment(db, user, segment_id, data.text)


@router.patch("/comments/{comment_id}", response_model=CommentOut)
def update_comment(
    comment_id: int, data: CommentIn, db: DbSession, user: CurrentUser
) -> SegmentComment:
    return service.update_comment(db, user, comment_id, data.text)


@router.delete("/comments/{comment_id}", status_code=204)
def delete_comment(comment_id: int, db: DbSession, user: CurrentUser) -> None:
    service.delete_comment(db, user, comment_id)


@router.get("/meetings/{meeting_id}/soundbites", response_model=list[SoundbiteOut])
def list_soundbites(meeting_id: int, db: DbSession, user: CurrentUser) -> list[Soundbite]:
    return service.list_soundbites(db, user, meeting_id)


@router.post("/meetings/{meeting_id}/soundbites", response_model=SoundbiteOut, status_code=201)
def create_soundbite(
    meeting_id: int, data: SoundbiteCreate, db: DbSession, user: CurrentUser
) -> Soundbite:
    return service.create_soundbite(db, user, meeting_id, data)


@router.patch("/soundbites/{soundbite_id}", response_model=SoundbiteOut)
def rename_soundbite(
    soundbite_id: int, data: SoundbiteUpdate, db: DbSession, user: CurrentUser
) -> Soundbite:
    return service.rename_soundbite(db, user, soundbite_id, data.title)


@router.delete("/soundbites/{soundbite_id}", status_code=204)
def delete_soundbite(soundbite_id: int, db: DbSession, user: CurrentUser) -> None:
    service.delete_soundbite(db, user, soundbite_id)
