"""/api/participants: the people directory, for filters and forms."""

from fastapi import APIRouter

from app.dependencies import CurrentUser, DbSession
from app.models import Participant
from app.schemas.participant import ParticipantOut
from app.services import participants as service

router = APIRouter(prefix="/participants", tags=["participants"])


@router.get("", response_model=list[ParticipantOut])
def list_participants(db: DbSession, _user: CurrentUser) -> list[Participant]:
    # _user: requires a logged-in user, like every other route (a no-op until real auth).
    return service.list_participants(db)
