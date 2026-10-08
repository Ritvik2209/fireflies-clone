"""Database setup: engine, sessions, the declarative base and the per-request session dependency."""

import sqlite3
from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

# FastAPI runs sync endpoints in a thread pool, so one request's connection can be used from more
# than one thread (never at the same time). sqlite3 refuses that unless check_same_thread is off.
engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})


@event.listens_for(engine, "connect")
def _enable_foreign_keys(dbapi_connection: sqlite3.Connection, _connection_record: object) -> None:
    # SQLite ships with foreign-key enforcement off, per connection. Without this,
    # ON DELETE CASCADE / RESTRICT / SET NULL silently do nothing.
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    """Base class of every ORM model; Base.metadata knows all tables."""


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request, always closed afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create any missing tables. It never alters existing ones (production would use Alembic)."""
    import app.models  # noqa: F401  (imports every model so Base.metadata has all tables)

    Base.metadata.create_all(bind=engine)
