"""The account that owns meetings (one default user until real authentication exists)."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.types import UTCDateTime, utc_now

if TYPE_CHECKING:
    from app.models.meeting import Meeting


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utc_now)

    meetings: Mapped[list["Meeting"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
