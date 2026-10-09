from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import TranscriptSegment

TRANSCRIPT = """[00:00] Priya Shah: Morning all. Let's review the sprint goals for the mobile app.
[00:40] Daniel Okafor: I'll finish the offline sync work by Friday.
[01:30] Priya Shah: Great, thanks. Sam can test it on Android devices next week."""


def _create(client: TestClient, **overrides: Any) -> dict[str, Any]:
    body = {
        "title": "Sprint planning",
        "meeting_date": "2026-10-06T04:30:00Z",
        "participant_names": ["Sam Rivera"],
        "transcript_text": TRANSCRIPT,
        "format": "txt",
        "source": "paste",
    } | overrides
    response = client.post("/api/meetings", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def _names(meeting: dict[str, Any]) -> list[str]:
    return [participant["name"] for participant in meeting["participants"]]


def test_create_parses_the_transcript_and_generates_notes(client: TestClient) -> None:
    meeting = _create(client)

    assert meeting["meeting_date"] == "2026-10-06T04:30:00Z"  # always sent with a UTC offset
    assert (meeting["status"], meeting["error_message"]) == ("ready", None)
    assert _names(meeting) == ["Daniel Okafor", "Priya Shah", "Sam Rivera"]
    assert [segment["start_ms"] for segment in meeting["segments"]] == [0, 40_000, 90_000]
    assert meeting["duration_ms"] == meeting["segments"][-1]["end_ms"]
    assert meeting["summary"]["generated_by"] == "rule_based"
    daniel = next(p["id"] for p in meeting["participants"] if p["name"] == "Daniel Okafor")
    commitments = [
        (item["text"], item["assignee_id"], item["source_start_ms"])
        for item in meeting["action_items"]
    ]
    assert ("I'll finish the offline sync work by Friday.", daniel, 40_000) in commitments


def test_create_rejects_an_unparseable_transcript_and_stores_nothing(client: TestClient) -> None:
    response = client.post(
        "/api/meetings",
        json={
            "title": "Notes",
            "meeting_date": "2026-10-06T04:30:00Z",
            "transcript_text": "just some notes",
            "format": "txt",
            "source": "paste",
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"].startswith("Line 1: expected")
    assert client.get("/api/meetings").json() == []


def test_create_validates_the_body(client: TestClient) -> None:
    empty_title = client.post("/api/meetings", json={"title": " ", "format": "txt"})
    naive_date = _body_with(meeting_date="2026-10-06T10:00:00")

    assert empty_title.status_code == 422
    assert empty_title.json()["detail"].startswith("title:")
    assert (
        client.post("/api/meetings", json=naive_date).json()["detail"].startswith("meeting_date:")
    )


def _body_with(**overrides: Any) -> dict[str, Any]:
    return {
        "title": "Sprint planning",
        "meeting_date": "2026-10-06T04:30:00Z",
        "transcript_text": TRANSCRIPT,
        "format": "txt",
        "source": "paste",
    } | overrides


def test_list_filters_and_sorts(client: TestClient) -> None:
    sprint = _create(client, title="Sprint 42 planning", meeting_date="2026-10-06T04:30:00Z")
    _create(
        client,
        title="Design review",
        meeting_date="2026-10-07T08:30:00Z",
        transcript_text="[00:00] Lena Fischer: Here is the new dispatch board.",
    )
    _create(client, title="Old 50% sync", meeting_date="2026-09-01T10:00:00Z")

    def titles(**params: Any) -> list[str]:
        response = client.get("/api/meetings", params=params)
        assert response.status_code == 200, response.text
        return [meeting["title"] for meeting in response.json()]

    assert titles() == ["Design review", "Sprint 42 planning", "Old 50% sync"]
    assert titles(sort="oldest") == ["Old 50% sync", "Sprint 42 planning", "Design review"]
    assert titles(q="SPRINT") == ["Sprint 42 planning"]  # case-insensitive
    assert titles(q="50%") == ["Old 50% sync"]  # % is matched literally, not as a wildcard
    daniel = next(p["id"] for p in sprint["participants"] if p["name"] == "Daniel Okafor")
    assert titles(participant_id=daniel) == ["Sprint 42 planning", "Old 50% sync"]
    assert titles(date_from="2026-10-01T00:00:00Z", date_to="2026-10-06T23:59:59Z") == [
        "Sprint 42 planning"
    ]


def test_list_rejects_an_inverted_date_range(client: TestClient) -> None:
    response = client.get(
        "/api/meetings",
        params={"date_from": "2026-10-07T00:00:00Z", "date_to": "2026-10-01T00:00:00Z"},
    )

    assert response.status_code == 422
    assert "date_from must not be after date_to" in response.json()["detail"]


def test_get_unknown_meeting_is_404(client: TestClient) -> None:
    response = client.get("/api/meetings/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Meeting 999 not found"}


def test_patch_updates_title_and_participants(client: TestClient) -> None:
    meeting = _create(client)

    response = client.patch(
        f"/api/meetings/{meeting['id']}",
        json={
            "title": "Sprint 42 planning",
            "participant_names": _names(meeting)[:2] + ["lena fischer"],
        },
    )

    assert response.status_code == 200, response.text
    updated = response.json()
    assert updated["title"] == "Sprint 42 planning"
    assert _names(updated) == ["Daniel Okafor", "lena fischer", "Priya Shah"]
    assert updated["updated_at"] >= meeting["updated_at"]


def test_patch_cannot_remove_someone_who_speaks(client: TestClient) -> None:
    meeting = _create(client)

    response = client.patch(
        f"/api/meetings/{meeting['id']}", json={"participant_names": ["Priya Shah"]}
    )

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "Daniel Okafor can't be removed: they speak in this meeting's transcript"
    )


def test_patch_rejects_null_for_required_fields(client: TestClient) -> None:
    meeting = _create(client)

    response = client.patch(f"/api/meetings/{meeting['id']}", json={"title": None})

    assert response.status_code == 422
    assert response.json()["detail"] == "title: can't be null"


def test_delete_cascades_to_the_transcript_but_keeps_participants(
    client: TestClient, db: Session
) -> None:
    meeting = _create(client)

    response = client.delete(f"/api/meetings/{meeting['id']}")

    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/api/meetings/{meeting['id']}").status_code == 404
    remaining = db.scalar(
        select(func.count())
        .select_from(TranscriptSegment)
        .where(TranscriptSegment.meeting_id == meeting["id"])
    )
    assert remaining == 0
    assert [p["name"] for p in client.get("/api/participants").json()] == _names(meeting)
