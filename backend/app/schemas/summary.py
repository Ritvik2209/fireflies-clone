from datetime import datetime

from app.models.summary import GeneratedBy
from app.schemas.base import ORMModel


class SummaryOut(ORMModel):
    overview: str
    keywords: list[str]
    generated_by: GeneratedBy
    created_at: datetime


class ChapterOut(ORMModel):
    id: int
    position: int
    title: str
    start_ms: int
