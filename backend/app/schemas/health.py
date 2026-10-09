"""Response model for the health check."""

from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"]
    sqlite_version: str
    fts5: bool
    llm_configured: bool  # is LLM_API_KEY set? (never the key itself)
