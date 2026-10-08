"""FastAPI application: startup, middleware, error handlers and routers."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.config import settings
from app.database import init_db
from app.errors import register_exception_handlers
from app.routers import action_items, health, meetings, participants


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # Runs once when the server starts: create any missing tables.
    init_db()
    yield


app = FastAPI(title="Glowworm API", version="0.1.0", lifespan=lifespan)

# The browser calls this API directly from the frontend's origin, so that origin must be allowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

for router in (health.router, meetings.router, action_items.router, participants.router):
    app.include_router(router, prefix="/api")


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    # Visiting the bare API URL lands on the interactive docs instead of a 404.
    return RedirectResponse(url="/docs")
