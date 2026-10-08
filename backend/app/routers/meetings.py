"""/api/meetings: list, create, read, update and delete meetings. HTTP concerns only."""

from typing import Annotated

from fastapi import APIRouter, Query

from app.dependencies import CurrentUser, DbSession
from app.models import Meeting
from app.schemas.base import ERROR_RESPONSES
from app.schemas.meeting import (
    MeetingCreate,
    MeetingDetail,
    MeetingFilters,
    MeetingListItem,
    MeetingUpdate,
)
from app.services import meetings as service

router = APIRouter(prefix="/meetings", tags=["meetings"], responses=ERROR_RESPONSES)


@router.get("", response_model=list[MeetingListItem])
def list_meetings(
    db: DbSession, user: CurrentUser, filters: Annotated[MeetingFilters, Query()]
) -> list[Meeting]:
    return service.list_meetings(db, user, filters)


@router.post("", response_model=MeetingDetail, status_code=201)
def create_meeting(data: MeetingCreate, db: DbSession, user: CurrentUser) -> Meeting:
    return service.create_meeting(db, user, data)


@router.get("/{meeting_id}", response_model=MeetingDetail)
def get_meeting(meeting_id: int, db: DbSession, user: CurrentUser) -> Meeting:
    return service.get_meeting(db, user, meeting_id)


@router.patch(
    "/{meeting_id}",
    response_model=MeetingDetail,
    responses={409: {"description": "A participant who speaks in the transcript was removed"}},
)
def update_meeting(
    meeting_id: int, data: MeetingUpdate, db: DbSession, user: CurrentUser
) -> Meeting:
    return service.update_meeting(db, user, meeting_id, data)


@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: int, db: DbSession, user: CurrentUser) -> None:
    service.delete_meeting(db, user, meeting_id)
