"""Building blocks shared by the schemas."""

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    """A response model that can be built straight from a SQLAlchemy object."""

    model_config = ConfigDict(from_attributes=True)


class FieldError(BaseModel):
    field: str
    message: str


class ErrorResponse(BaseModel):
    """Every error the API returns has this shape; validation errors also list each field."""

    detail: str
    errors: list[FieldError] = []


# Documents the error shape in the OpenAPI docs (/docs) for the routes that can return it.
ERROR_RESPONSES: dict[int | str, dict[str, object]] = {
    404: {"model": ErrorResponse, "description": "Not found"},
    422: {"model": ErrorResponse, "description": "Invalid input"},
}
