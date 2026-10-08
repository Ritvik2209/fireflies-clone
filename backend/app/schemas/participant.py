from app.models.participant import AvatarColor
from app.schemas.base import ORMModel


class ParticipantOut(ORMModel):
    id: int
    name: str
    email: str | None
    avatar_color: AvatarColor
