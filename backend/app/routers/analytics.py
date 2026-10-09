"""/api/meetings/{id}/analytics (Extra 2): speaker talk-time statistics. HTTP concerns only."""

from fastapi import APIRouter

from app.dependencies import CurrentUser, DbSession
from app.schemas.analytics import MeetingAnalytics
from app.schemas.base import ERROR_RESPONSES
from app.services import analytics as service

router = APIRouter(prefix="/meetings", tags=["analytics"], responses=ERROR_RESPONSES)


@router.get("/{meeting_id}/analytics", response_model=MeetingAnalytics)
def get_analytics(meeting_id: int, db: DbSession, user: CurrentUser) -> service.MeetingStats:
    """Who talked how much, computed from the transcript on every request."""
    return service.meeting_analytics(db, user, meeting_id)
