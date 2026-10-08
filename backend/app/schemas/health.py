"""Response model for the health check."""

from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"]
    sqlite_version: str
    fts5: bool
