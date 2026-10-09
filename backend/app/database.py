"""Database setup: engine, sessions, the declarative base and the per-request session dependency."""

import sqlite3
from collections.abc import Iterator

from sqlalchemy import create_engine, event, text
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


# Full-text search over transcript lines (bonus 4, ARCHITECTURE.md §6.6). SQLAlchemy has no model
# for an FTS5 virtual table, so it's plain SQL; IF NOT EXISTS makes it safe to run on every start.
# "External content": the index points at transcript_segments rows instead of copying their text.
_FTS_SETUP = (
    """CREATE VIRTUAL TABLE IF NOT EXISTS segments_fts USING fts5(
        text, content='transcript_segments', content_rowid='id', tokenize='porter unicode61'
    )""",
    # Triggers keep the index in step with every insert, update and delete (cascades included),
    # inside the same transaction. 'delete' tells FTS5 which old text to un-index.
    """CREATE TRIGGER IF NOT EXISTS transcript_segments_ai AFTER INSERT ON transcript_segments
    BEGIN
        INSERT INTO segments_fts (rowid, text) VALUES (new.id, new.text);
    END""",
    """CREATE TRIGGER IF NOT EXISTS transcript_segments_ad AFTER DELETE ON transcript_segments
    BEGIN
        INSERT INTO segments_fts (segments_fts, rowid, text) VALUES ('delete', old.id, old.text);
    END""",
    """CREATE TRIGGER IF NOT EXISTS transcript_segments_au AFTER UPDATE ON transcript_segments
    BEGIN
        INSERT INTO segments_fts (segments_fts, rowid, text) VALUES ('delete', old.id, old.text);
        INSERT INTO segments_fts (rowid, text) VALUES (new.id, new.text);
    END""",
    # Index lines that existed before the index did. Rebuilding is safe to repeat.
    "INSERT INTO segments_fts (segments_fts) VALUES ('rebuild')",
)


def init_db() -> None:
    """Create any missing tables. It never alters existing ones (production would use Alembic)."""
    import app.models  # noqa: F401  (imports every model so Base.metadata has all tables)

    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:  # one transaction, committed at the end
        for statement in _FTS_SETUP:
            connection.execute(text(statement))
