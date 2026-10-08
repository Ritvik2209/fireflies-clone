"""Application settings, read once from environment variables (with local defaults)."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    cors_origins: tuple[str, ...]


def _split_comma_separated(value: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in value.split(",") if item.strip())


def load_settings() -> Settings:
    return Settings(
        database_url=os.environ.get("DATABASE_URL", "sqlite:///./app.db"),
        # Local default: Next's usual port, plus 3001 for machines where 3000 is taken.
        cors_origins=_split_comma_separated(
            os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")
        ),
    )


settings = load_settings()
