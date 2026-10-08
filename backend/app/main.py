"""FastAPI application: middleware and routers."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.config import settings
from app.routers import health

app = FastAPI(title="Glowworm API", version="0.1.0")

# The browser calls this API directly from the frontend's origin, so that origin must be allowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    # Visiting the bare API URL lands on the interactive docs instead of a 404.
    return RedirectResponse(url="/docs")
