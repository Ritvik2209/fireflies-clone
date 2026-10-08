"""People who appear in meetings: matched to the directory by name (ignoring case) or created."""

import zlib

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Participant
from app.models.participant import AVATAR_COLORS


def normalize_name(name: str) -> str:
    """Trim and collapse inner whitespace: '  Priya   Shah ' → 'Priya Shah'."""
    return " ".join(name.split())


def color_for_name(name: str) -> str:
    """Derive the avatar colour from the name, so a person always gets the same colour."""
    return AVATAR_COLORS[zlib.crc32(name.lower().encode()) % len(AVATAR_COLORS)]


def get_or_create_participant(db: Session, name: str) -> Participant:
    clean = normalize_name(name)
    # participants.name is COLLATE NOCASE, so this comparison ignores case and uses the index.
    participant = db.scalar(
        select(Participant).where(Participant.name == clean).order_by(Participant.id).limit(1)
    )
    if participant is None:
        participant = Participant(name=clean, avatar_color=color_for_name(clean))
        db.add(participant)
    return participant


def list_participants(db: Session) -> list[Participant]:
    return list(db.scalars(select(Participant).order_by(Participant.name)))
