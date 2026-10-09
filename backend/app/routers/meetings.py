"""/api/meetings: list, create, read, update and delete meetings. HTTP concerns only."""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Query

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
from app.services import processing

router = APIRouter(prefix="/meetings", tags=["meetings"], responses=ERROR_RESPONSES)


@router.get("", response_model=list[MeetingListItem])
def list_meetings(
    db: DbSession, user: CurrentUser, filters: Annotated[MeetingFilters, Query()]
) -> list[Meeting]:
    return service.list_meetings(db, user, filters)


@router.post(
    "",
    response_model=MeetingListItem,
    status_code=202,
    responses={202: {"description": "Saved as processing; poll GET /meetings/{id}"}},
)
def create_meeting(
    data: MeetingCreate, background_tasks: BackgroundTasks, db: DbSession, user: CurrentUser
) -> Meeting:
    """Saves the meeting as "processing"; its transcript is parsed after the response."""
    meeting = processing.start_meeting(db, user, data)
    background_tasks.add_task(processing.process_meeting, meeting.id, data)
    return meeting


@router.get("/{meeting_id}", response_model=MeetingDetail)
def get_meeting(meeting_id: int, db: DbSession, user: CurrentUser) -> Meeting:
    return service.get_meeting(db, user, meeting_id)


@router.patch(
    "/{meeting_id}",
    response_model=MeetingDetail,
    responses={
        409: {
            "description": "A participant who speaks in the transcript was removed, "
            "or the transcript isn't processed"
        }
    },
)
def update_meeting(
    meeting_id: int, data: MeetingUpdate, db: DbSession, user: CurrentUser
) -> Meeting:
    return service.update_meeting(db, user, meeting_id, data)


@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: int, db: DbSession, user: CurrentUser) -> None:
    service.delete_meeting(db, user, meeting_id)
