"""Health check: the API is up, and its SQLite build supports what the app needs."""

import sqlite3
from functools import cache

from app.schemas.health import HealthResponse


@cache  # the answer can't change while the process runs
def sqlite_has_fts5() -> bool:
    """True if this Python's SQLite was compiled with FTS5 (needed for global search)."""
    connection = sqlite3.connect(":memory:")
    try:
        connection.execute("CREATE VIRTUAL TABLE fts5_probe USING fts5(text)")
        return True
    except sqlite3.OperationalError:
        return False
    finally:
        connection.close()


def get_health() -> HealthResponse:
    return HealthResponse(
        status="ok", sqlite_version=sqlite3.sqlite_version, fts5=sqlite_has_fts5()
    )
