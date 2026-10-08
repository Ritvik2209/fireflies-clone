"""GET /api/health: used by Render's health check and by the frontend."""

from fastapi import APIRouter

from app.schemas.health import HealthResponse
from app.services.health import get_health

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return get_health()
