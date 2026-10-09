"""Background processing for uploads (Extra 3): 202 straight away, then "ready" or "failed"."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Meeting, Participant, TranscriptSegment, User
from app.schemas.meeting import MeetingCreate
from app.services import processing

TRANSCRIPT = """[00:00] Priya Shah: Morning all. Let's review the sprint goals.
[00:40] Daniel Okafor: I'll finish the offline sync work by Friday."""


def _body(**overrides: Any) -> dict[str, Any]:
    return {
        "title": "Sprint planning",
        "meeting_date": "2026-10-06T04:30:00Z",
        "participant_names": ["Sam Rivera"],
        "transcript_text": TRANSCRIPT,
        "format": "txt",
        "source": "paste",
    } | overrides


def _count(db: Session, model: type) -> int:
    return db.scalar(select(func.count()).select_from(model)) or 0


def test_create_answers_202_and_the_job_makes_the_meeting_ready(client: TestClient) -> None:
    response = client.post("/api/meetings", json=_body())

    assert response.status_code == 202
    accepted = response.json()
    assert (accepted["status"], accepted["error_message"]) == ("processing", None)
    assert (accepted["duration_ms"], accepted["participants"]) == (0, [])  # not parsed yet
    # TestClient runs the background task before post() returns, so the job has finished.
    meeting = client.get(f"/api/meetings/{accepted['id']}").json()
    assert meeting["status"] == "ready"
    assert [segment["start_ms"] for segment in meeting["segments"]] == [0, 40_000]
    assert meeting["summary"]["generated_by"] == "rule_based"
    assert {p["name"] for p in meeting["participants"]} == {
        "Priya Shah",
        "Daniel Okafor",
        "Sam Rivera",
    }
    assert meeting["duration_ms"] == meeting["segments"][-1]["end_ms"]


def test_obvious_bad_input_is_still_rejected_at_once(client: TestClient) -> None:
    blank = client.post("/api/meetings", json=_body(transcript_text="  \n "))
    unknown_format = client.post("/api/meetings", json=_body(format="docx"))
    no_title = client.post("/api/meetings", json=_body(title=""))

    assert blank.status_code == unknown_format.status_code == no_title.status_code == 422
    assert blank.json()["detail"] == "transcript_text: the transcript is empty"
    assert client.get("/api/meetings").json() == []  # nothing was created


def test_a_crash_after_saving_half_the_meeting_rolls_everything_back(
    client: TestClient, db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    real_fill = processing.fill_meeting

    def fill_then_crash(*args: Any, **kwargs: Any) -> None:
        real_fill(*args, **kwargs)  # segments, people and notes are in the transaction…
        raise RuntimeError("disk full")  # …when something unexpected goes wrong

    monkeypatch.setattr(processing, "fill_meeting", fill_then_crash)
    response = client.post("/api/meetings", json=_body())

    meeting = client.get(f"/api/meetings/{response.json()['id']}").json()
    assert (meeting["status"], meeting["error_message"]) == ("failed", processing.UNEXPECTED_ERROR)
    assert _count(db, TranscriptSegment) == 0
    assert _count(db, Participant) == 0  # not even the speakers it had created


def test_a_meeting_cannot_be_edited_while_it_is_processing(client: TestClient, db: Session) -> None:
    owner = db.scalars(select(User)).one()
    meeting = processing.start_meeting(db, owner, MeetingCreate(**_body()))  # no job runs here

    response = client.patch(f"/api/meetings/{meeting.id}", json={"title": "Renamed"})

    assert response.status_code == 409
    assert client.get(f"/api/meetings/{meeting.id}").json()["title"] == "Sprint planning"


def test_meetings_left_processing_by_a_restart_are_marked_failed(
    client: TestClient, db: Session
) -> None:
    owner = db.scalars(select(User)).one()
    stuck = processing.start_meeting(db, owner, MeetingCreate(**_body()))

    assert processing.fail_interrupted(db) == 1

    db.refresh(stuck)
    assert (stuck.status, stuck.error_message) == ("failed", processing.INTERRUPTED)


def test_the_job_does_nothing_if_the_meeting_was_deleted_first(
    client: TestClient, db: Session
) -> None:
    processing.process_meeting(12345, MeetingCreate(**_body()))  # no such meeting: no error

    assert _count(db, Meeting) == 0
