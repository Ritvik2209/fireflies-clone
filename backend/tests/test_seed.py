"""The seed data follows the brief's rules, and every timestamp lands on a real transcript line."""

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.main import app
from app.models import Meeting, User
from app.seed.seed import seed_if_empty

MINUTE = 60_000


def test_seeds_once_with_the_default_user_and_six_meetings(db: Session) -> None:
    assert seed_if_empty(db) is True
    assert seed_if_empty(db) is False  # a database with a user is left alone

    assert db.scalar(select(User.name)) == "Alex Morgan"
    assert db.scalar(select(func.count()).select_from(Meeting)) == 6


def test_seeded_meetings_meet_the_brief(db: Session) -> None:
    seed_if_empty(db)

    for meeting in db.scalars(select(Meeting)):
        segment_starts = [segment.start_ms for segment in meeting.segments]
        participant_ids = {participant.id for participant in meeting.participants}

        assert 30 <= len(meeting.segments) <= 60, meeting.title
        assert 15 * MINUTE <= meeting.duration_ms <= 45 * MINUTE, meeting.title
        assert 2 <= len(meeting.participants) <= 5, meeting.title
        assert 4 <= len(meeting.chapters) <= 6, meeting.title
        assert 3 <= len(meeting.action_items) <= 6, meeting.title
        completed = [item.is_completed for item in meeting.action_items]
        assert any(completed) and not all(completed), meeting.title
        assert meeting.summary is not None and meeting.summary.generated_by == "seed"
        assert len(meeting.summary.keywords) == 6

        assert segment_starts == sorted(segment_starts)
        assert all(segment.end_ms <= meeting.duration_ms for segment in meeting.segments)
        assert {segment.speaker_id for segment in meeting.segments} <= participant_ids
        # Clicking a chapter or an action item seeks to the exact start of a line.
        assert all(chapter.start_ms in segment_starts for chapter in meeting.chapters)
        assert all(item.source_start_ms in segment_starts for item in meeting.action_items)
        assert all(item.assignee_id in participant_ids for item in meeting.action_items)


def test_the_api_lists_seeded_meetings_newest_first(db: Session) -> None:
    seed_if_empty(db)

    meetings = TestClient(app).get("/api/meetings").json()

    assert [meeting["title"] for meeting in meetings][:2] == [
        "Dispatch board redesign review",
        "Sprint 42 planning",
    ]
    assert len(meetings) == 6
