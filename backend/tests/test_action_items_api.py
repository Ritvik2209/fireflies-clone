from typing import Any

from fastapi.testclient import TestClient
from helpers import create_meeting

TRANSCRIPT = """[00:00] Priya Shah: Let's plan the release.
[00:30] Daniel Okafor: Sounds good."""


def _meeting(client: TestClient, participants: list[str] | None = None) -> dict[str, Any]:
    return create_meeting(
        client,
        {
            "title": "Release planning",
            "meeting_date": "2026-10-06T04:30:00Z",
            "participant_names": participants or ["Sam Rivera"],
            "transcript_text": TRANSCRIPT,
            "format": "txt",
            "source": "paste",
        },
    )


def _person(meeting: dict[str, Any], name: str) -> int:
    return next(p["id"] for p in meeting["participants"] if p["name"] == name)


def test_add_edit_complete_and_delete_an_action_item(client: TestClient) -> None:
    meeting = _meeting(client)
    sam = _person(meeting, "Sam Rivera")

    created = client.post(
        f"/api/meetings/{meeting['id']}/action-items",
        json={"text": " Test the release on Android ", "assignee_id": sam},
    )
    assert created.status_code == 201, created.text
    item = created.json()
    assert (item["text"], item["assignee_id"], item["is_completed"]) == (
        "Test the release on Android",
        sam,
        False,
    )

    completed = client.patch(f"/api/action-items/{item['id']}", json={"is_completed": True})
    assert completed.status_code == 200
    assert completed.json()["is_completed"] is True
    assert completed.json()["text"] == "Test the release on Android"  # unsent fields unchanged

    unassigned = client.patch(f"/api/action-items/{item['id']}", json={"assignee_id": None})
    assert unassigned.json()["assignee_id"] is None

    assert client.delete(f"/api/action-items/{item['id']}").status_code == 204
    assert client.patch(f"/api/action-items/{item['id']}", json={"text": "x"}).status_code == 404


def test_assignee_must_be_a_participant_of_the_meeting(client: TestClient) -> None:
    meeting = _meeting(client)
    other = _meeting(client, participants=["Lena Fischer"])

    response = client.post(
        f"/api/meetings/{meeting['id']}/action-items",
        json={"text": "Review designs", "assignee_id": _person(other, "Lena Fischer")},
    )

    assert response.status_code == 422
    assert response.json() == {"detail": "The assignee must be a participant of this meeting"}


def test_null_text_is_rejected(client: TestClient) -> None:
    meeting = _meeting(client)
    item = client.post(
        f"/api/meetings/{meeting['id']}/action-items", json={"text": "Write notes"}
    ).json()

    response = client.patch(f"/api/action-items/{item['id']}", json={"text": None})

    assert response.status_code == 422
    assert response.json()["detail"] == "text: can't be null"


def test_unknown_meeting_is_404(client: TestClient) -> None:
    response = client.post("/api/meetings/999/action-items", json={"text": "Anything"})

    assert response.status_code == 404


def test_removing_a_participant_unassigns_their_tasks(client: TestClient) -> None:
    meeting = _meeting(client)
    sam = _person(meeting, "Sam Rivera")
    item = client.post(
        f"/api/meetings/{meeting['id']}/action-items", json={"text": "Run QA", "assignee_id": sam}
    ).json()

    client.patch(
        f"/api/meetings/{meeting['id']}",
        json={"participant_names": ["Priya Shah", "Daniel Okafor"]},
    )

    detail = client.get(f"/api/meetings/{meeting['id']}").json()
    task = next(a for a in detail["action_items"] if a["id"] == item["id"])
    assert task["assignee_id"] is None
