"""/api/tags (bonus 2): the shared tag list. HTTP concerns only."""

from fastapi import APIRouter

from app.dependencies import CurrentUser, DbSession
from app.models import Tag
from app.schemas.base import ERROR_RESPONSES
from app.schemas.tag import TagCreate, TagOut
from app.services import tags as service

router = APIRouter(prefix="/tags", tags=["tags"], responses=ERROR_RESPONSES)


@router.get("", response_model=list[TagOut])
def list_tags(db: DbSession, _user: CurrentUser) -> list[Tag]:
    return service.list_tags(db)


@router.post(
    "",
    response_model=TagOut,
    status_code=201,
    responses={409: {"description": "A tag with this name already exists"}},
)
def create_tag(data: TagCreate, db: DbSession, _user: CurrentUser) -> Tag:
    return service.create_tag(db, data)


@router.delete("/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: DbSession, _user: CurrentUser) -> None:
    service.delete_tag(db, tag_id)
