"""Loads seed_data.json into an empty database: the default user, people, tags and six meetings.

Runs at startup. Render's free disk is wiped on every restart, so the demo data comes back each
time; a database that already has a user is left alone.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Highlight, Meeting, Participant, SegmentComment, Soundbite, Tag, User
from app.parsers.base import ParsedSegment, parse_timestamp
from app.services.meetings import save_meeting
from app.services.summary_generator import MeetingNotes, NoteActionItem, NoteChapter

SEED_FILE = Path(__file__).with_name("seed_data.json")


def seed_if_empty(db: Session) -> bool:
    """Seed the database if it has no users yet. Returns whether it seeded."""
    if db.scalar(select(User.id).limit(1)) is not None:
        return False

    data = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    user = User(**data["user"])
    db.add(user)
    # Create the people first, so the meetings reuse them (with their email and colour).
    for name, person in data["people"].items():
        db.add(Participant(name=name, email=person["email"], avatar_color=person["color"]))
    tags = {name: Tag(name=name, color=color) for name, color in data["tags"].items()}
    db.add_all(tags.values())
    db.flush()

    for meeting in data["meetings"]:
        duration_ms = parse_timestamp(meeting["duration"])
        saved = save_meeting(
            db,
            owner=user,
            title=meeting["title"],
            meeting_date=datetime.fromisoformat(meeting["date"]),
            source="seed",
            segments=_segments(meeting["transcript"], duration_ms),
            participant_names=meeting["participants"],
            notes=_notes(meeting),
            duration_ms=duration_ms,
        )
        saved.tags = [tags[name] for name in meeting["tags"]]
        _annotations(db, user, saved, meeting)
    db.commit()
    return True


def _annotations(db: Session, user: User, saved: Meeting, meeting: dict[str, Any]) -> None:
    """Bonus 5 demo data. Lines are referred to by their start time ("mm:ss")."""
    line = {segment.start_ms: segment for segment in saved.segments}
    for start, color in meeting.get("highlights", []):
        db.add(Highlight(segment=line[parse_timestamp(start)], user_id=user.id, color=color))
    for start, text in meeting.get("comments", []):
        db.add(SegmentComment(segment=line[parse_timestamp(start)], user_id=user.id, text=text))
    for clip in meeting.get("soundbites", []):
        db.add(
            Soundbite(
                meeting=saved,
                user_id=user.id,
                title=clip["title"],
                start_ms=parse_timestamp(clip["start"]),
                end_ms=parse_timestamp(clip["end"]),
            )
        )


def _segments(rows: list[list[str]], duration_ms: int) -> list[ParsedSegment]:
    """Rows are [speaker, "mm:ss", text]; each line lasts until the next one starts."""
    starts = [parse_timestamp(start) for _, start, _ in rows]
    ends = [*starts[1:], duration_ms]
    return [
        ParsedSegment(speaker=speaker, start_ms=start, end_ms=end, text=text)
        for (speaker, _, text), start, end in zip(rows, starts, ends, strict=True)
    ]


def _notes(meeting: dict[str, Any]) -> MeetingNotes:
    return MeetingNotes(
        overview=meeting["summary"]["overview"],
        keywords=meeting["summary"]["keywords"],
        chapters=[
            NoteChapter(title=title, start_ms=parse_timestamp(start))
            for start, title in meeting["chapters"]
        ],
        action_items=[
            NoteActionItem(
                text=item["text"],
                assignee=item["assignee"],
                start_ms=parse_timestamp(item["at"]),
                is_completed=item["done"],
            )
            for item in meeting["action_items"]
        ],
        generated_by="seed",
    )
