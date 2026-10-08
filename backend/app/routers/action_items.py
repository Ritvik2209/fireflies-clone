"""Action items: created under their meeting, then edited and deleted by their own id."""

from fastapi import APIRouter

from app.dependencies import CurrentUser, DbSession
from app.models import ActionItem
from app.schemas.action_item import ActionItemCreate, ActionItemOut, ActionItemUpdate
from app.schemas.base import ERROR_RESPONSES
from app.services import action_items as service

router = APIRouter(tags=["action items"], responses=ERROR_RESPONSES)


@router.post("/meetings/{meeting_id}/action-items", response_model=ActionItemOut, status_code=201)
def add_action_item(
    meeting_id: int, data: ActionItemCreate, db: DbSession, user: CurrentUser
) -> ActionItem:
    return service.add_action_item(db, user, meeting_id, data)


@router.patch("/action-items/{item_id}", response_model=ActionItemOut)
def update_action_item(
    item_id: int, data: ActionItemUpdate, db: DbSession, user: CurrentUser
) -> ActionItem:
    return service.update_action_item(db, user, item_id, data)


@router.delete("/action-items/{item_id}", status_code=204)
def delete_action_item(item_id: int, db: DbSession, user: CurrentUser) -> None:
    service.delete_action_item(db, user, item_id)
