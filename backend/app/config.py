"""Application settings, read once from environment variables (with local defaults)."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    cors_origins: tuple[str, ...]
    # Bonus 6 chat. No key means no LLM: the chat answers with search results instead.
    llm_provider: str
    llm_model: str
    llm_api_key: str | None


def _split_comma_separated(value: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in value.split(",") if item.strip())


def load_settings() -> Settings:
    return Settings(
        database_url=os.environ.get("DATABASE_URL", "sqlite:///./app.db"),
        # Local default: Next's usual port, plus 3001 for machines where 3000 is taken.
        cors_origins=_split_comma_separated(
            os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")
        ),
        llm_provider=os.environ.get("LLM_PROVIDER", "groq"),
        llm_model=os.environ.get("LLM_MODEL", "openai/gpt-oss-120b"),
        # Only ever set on the server. Stripped: a space or newline pasted with it breaks auth.
        llm_api_key=os.environ.get("LLM_API_KEY", "").strip() or None,
    )


settings = load_settings()
