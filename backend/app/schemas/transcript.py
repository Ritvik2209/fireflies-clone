from app.schemas.base import ORMModel


class SegmentOut(ORMModel):
    """One transcript line. The speaker's name and colour come from the meeting's participants."""

    id: int
    position: int
    speaker_id: int
    start_ms: int
    end_ms: int
    text: str
