"""FastAPI dependencies shared by the routers."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(db: DbSession) -> User:
    """The logged-in user.

    Real authentication is out of scope, so this returns the seeded default user (the first
    user). This is the single place real auth would plug in: verify a session or token here.
    """
    user = db.scalar(select(User).order_by(User.id).limit(1))
    if user is None:
        raise RuntimeError("No default user: the database has not been seeded")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
