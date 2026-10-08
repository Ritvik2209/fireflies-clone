"""Shared test fixtures. Tests use a temporary SQLite file, never the real app.db."""

import os
import tempfile
from collections.abc import Iterator
from pathlib import Path

# Must run before the app is imported: app.config reads DATABASE_URL at import time.
_TEST_DB = Path(tempfile.mkdtemp(prefix="glowworm-tests-")) / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB.as_posix()}"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.database import Base, SessionLocal, engine, init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402


@pytest.fixture
def db() -> Iterator[Session]:
    """A session on a freshly created, empty database."""
    Base.metadata.drop_all(bind=engine)
    init_db()
    with SessionLocal() as session:
        yield session


@pytest.fixture
def client(db: Session) -> TestClient:
    """An API client on an empty database that has only the default user."""
    db.add(User(name="Alex Morgan", email="alex.morgan@example.com"))
    db.commit()
    # Not used as a context manager, so the startup hook (create tables, seed) doesn't run.
    return TestClient(app)
