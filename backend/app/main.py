"""FastAPI application: startup, middleware, error handlers and routers."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.config import settings
from app.database import SessionLocal, init_db
from app.errors import register_exception_handlers
from app.routers import (
    action_items,
    analytics,
    annotations,
    chat,
    export,
    health,
    meetings,
    participants,
    search,
    tags,
)
from app.seed.seed import seed_if_empty


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # Runs once when the server starts: create any missing tables, then seed an empty database.
    init_db()
    with SessionLocal() as db:
        seed_if_empty(db)
    yield


app = FastAPI(title="Glowworm API", version="0.1.0", lifespan=lifespan)

# The browser calls this API directly from the frontend's origin, so that origin must be allowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_methods=["*"],
    allow_headers=["*"],
    # Lets the browser read the export's filename (only a few headers are visible by default).
    expose_headers=["Content-Disposition"],
)

register_exception_handlers(app)

for router in (
    health.router,
    meetings.router,
    action_items.router,
    participants.router,
    tags.router,
    export.router,
    search.router,
    annotations.router,
    chat.router,
    analytics.router,
):
    app.include_router(router, prefix="/api")


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    # Visiting the bare API URL lands on the interactive docs instead of a 404.
    return RedirectResponse(url="/docs")
