"""Action items: add, edit, complete and delete. Assignees must be participants of the meeting."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import InvalidInputError, NotFoundError
from app.models import ActionItem, Meeting, User, meeting_participants
from app.schemas.action_item import ActionItemCreate, ActionItemUpdate
from app.services.meetings import get_owned_meeting


def add_action_item(
    db: Session, owner: User, meeting_id: int, data: ActionItemCreate
) -> ActionItem:
    meeting = get_owned_meeting(db, owner, meeting_id)
    _check_assignee(db, meeting.id, data.assignee_id)
    item = ActionItem(meeting=meeting, text=data.text, assignee_id=data.assignee_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_action_item(
    db: Session, owner: User, item_id: int, data: ActionItemUpdate
) -> ActionItem:
    item = _get_owned_item(db, owner, item_id)
    sent = data.model_fields_set  # PATCH: only change the fields the client sent
    if "text" in sent and data.text is not None:
        item.text = data.text
    if "is_completed" in sent and data.is_completed is not None:
        item.is_completed = data.is_completed
    if "assignee_id" in sent:  # None here means "unassign"
        _check_assignee(db, item.meeting_id, data.assignee_id)
        item.assignee_id = data.assignee_id
    db.commit()
    db.refresh(item)
    return item


def delete_action_item(db: Session, owner: User, item_id: int) -> None:
    db.delete(_get_owned_item(db, owner, item_id))
    db.commit()


def _get_owned_item(db: Session, owner: User, item_id: int) -> ActionItem:
    item = db.scalar(
        select(ActionItem)
        .join(ActionItem.meeting)
        .where(ActionItem.id == item_id, Meeting.owner_id == owner.id)
    )
    if item is None:
        raise NotFoundError(f"Action item {item_id} not found")
    return item


def _check_assignee(db: Session, meeting_id: int, assignee_id: int | None) -> None:
    if assignee_id is None:
        return
    link = db.scalar(
        select(meeting_participants.c.participant_id).where(
            meeting_participants.c.meeting_id == meeting_id,
            meeting_participants.c.participant_id == assignee_id,
        )
    )
    if link is None:
        raise InvalidInputError("The assignee must be a participant of this meeting")
