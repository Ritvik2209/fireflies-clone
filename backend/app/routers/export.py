"""/api/meetings/{id}/export (bonus 3): download the transcript or notes as a file."""

from typing import Annotated

from fastapi import APIRouter, Query, Response

from app.dependencies import CurrentUser, DbSession
from app.schemas.base import ERROR_RESPONSES
from app.services import export as service
from app.services.meetings import get_meeting

router = APIRouter(prefix="/meetings", tags=["export"], responses=ERROR_RESPONSES)


@router.get(
    "/{meeting_id}/export",
    response_class=Response,
    responses={200: {"description": "The file, with a Content-Disposition filename"}},
)
def export_meeting(
    meeting_id: int,
    content: service.ExportContent,
    fmt: Annotated[service.ExportFormat, Query(alias="format")],  # "format" is a Python builtin
    db: DbSession,
    user: CurrentUser,
) -> Response:
    file = service.export_meeting(get_meeting(db, user, meeting_id), content, fmt)
    # "attachment" makes the browser save the file instead of showing it.
    disposition = f'attachment; filename="{file.filename}"'
    return Response(
        file.body, media_type=file.media_type, headers={"Content-Disposition": disposition}
    )
