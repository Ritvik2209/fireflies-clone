"""Domain errors raised by services, and the handlers that turn them into JSON responses.

Services raise these instead of HTTPException, so they stay independent of HTTP; every error
reaches the client in the same shape: {"detail": "<message>"}.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base class: an error the client should see, with the HTTP status that fits it."""

    status_code = 500

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class NotFoundError(AppError):
    status_code = 404


class ConflictError(AppError):
    status_code = 409


class InvalidInputError(AppError):
    status_code = 422


class TooManyRequestsError(AppError):
    status_code = 429


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_request: Request, error: AppError) -> JSONResponse:
        return JSONResponse(status_code=error.status_code, content={"detail": error.detail})

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        _request: Request, error: RequestValidationError
    ) -> JSONResponse:
        # FastAPI's default puts a list in "detail"; we keep "detail" a readable string (for
        # toasts) and add the per-field list under "errors".
        errors = [
            {
                "field": _field_name(item["loc"]),
                "message": item["msg"].removeprefix("Value error, "),
            }
            for item in error.errors()
        ]
        first = errors[0]
        return JSONResponse(
            status_code=422,
            content={"detail": f"{first['field']}: {first['message']}", "errors": errors},
        )


def _field_name(location: tuple[str | int, ...]) -> str:
    """('body', 'title') → 'title'; ('query', 'sort') → 'sort'; ('body',) → 'body'."""
    parts = [str(part) for part in location[1:]]
    return ".".join(parts) if parts else str(location[0])
