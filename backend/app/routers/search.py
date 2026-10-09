"""/api/search (bonus 4): full-text search across every transcript. HTTP concerns only."""

from typing import Annotated

from fastapi import APIRouter, Query

from app.dependencies import CurrentUser, DbSession
from app.schemas.base import ERROR_RESPONSES
from app.schemas.search import SearchResult
from app.services import search as service

router = APIRouter(tags=["search"], responses=ERROR_RESPONSES)


@router.get("/search", response_model=list[SearchResult])
def search(
    q: Annotated[str, Query(min_length=1, max_length=200, description="Words to find")],
    db: DbSession,
    user: CurrentUser,
) -> list[dict[str, object]]:
    return service.search(db, user, q)
