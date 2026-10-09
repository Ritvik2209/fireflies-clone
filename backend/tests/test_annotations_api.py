"""Highlights, comments and soundbites (bonus 5)."""

from typing import Any

from fastapi.testclient import TestClient
from helpers import create_meeting
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Highlight, SegmentComment, Soundbite

TRANSCRIPT = """[00:00] Priya Shah: Let's review the launch plan.
[00:30] Sam Rivera: The beta goes out on Friday.
[01:00] Priya Shah: Great, thanks everyone."""


def _meeting(client: TestClient) -> dict[str, Any]:
    return create_meeting(
        client,
        {
            "title": "Launch review",
            "meeting_date": "2026-10-06T04:30:00Z",
            "transcript_text": TRANSCRIPT,
            "format": "txt",
            "source": "paste",
        },
    )


def _line(client: TestClient, meeting_id: int, index: int) -> dict[str, Any]:
    return client.get(f"/api/meetings/{meeting_id}").json()["segments"][index]


def test_a_line_has_one_highlight_whose_colour_can_change(client: TestClient, db: Session) -> None:
    meeting = _meeting(client)
    line_id = meeting["segments"][1]["id"]
    assert meeting["segments"][1]["highlight_color"] is None

    first = client.put(f"/api/segments/{line_id}/highlight", json={"color": "yellow"})
    second = client.put(f"/api/segments/{line_id}/highlight", json={"color": "green"})

    assert first.status_code == second.status_code == 200
    assert second.json() == {"segment_id": line_id, "color": "green"}
    assert db.scalar(select(func.count()).select_from(Highlight)) == 1  # replaced, not stacked
    assert _line(client, meeting["id"], 1)["highlight_color"] == "green"

    assert client.delete(f"/api/segments/{line_id}/highlight").status_code == 204
    assert _line(client, meeting["id"], 1)["highlight_color"] is None
    assert client.delete(f"/api/segments/{line_id}/highlight").status_code == 204  # idempotent
    assert (
        client.put(f"/api/segments/{line_id}/highlight", json={"color": "red"}).status_code == 422
    )
    assert client.put("/api/segments/999/highlight", json={"color": "pink"}).status_code == 404


def test_comments_can_be_added_listed_edited_and_deleted(client: TestClient) -> None:
    meeting = _meeting(client)
    line_id = meeting["segments"][0]["id"]

    created = client.post(f"/api/segments/{line_id}/comments", json={"text": "  Agreed!  "})

    assert created.status_code == 201
    comment = created.json()
    assert (comment["text"], comment["author_name"]) == ("Agreed!", "Alex Morgan")
    assert _line(client, meeting["id"], 0)["comment_count"] == 1
    listed = client.get(f"/api/segments/{line_id}/comments").json()
    assert [c["id"] for c in listed] == [comment["id"]]

    edited = client.patch(f"/api/comments/{comment['id']}", json={"text": "Agreed, Friday."})
    assert edited.json()["text"] == "Agreed, Friday."
    assert client.post(f"/api/segments/{line_id}/comments", json={"text": " "}).status_code == 422

    assert client.delete(f"/api/comments/{comment['id']}").status_code == 204
    assert _line(client, meeting["id"], 0)["comment_count"] == 0
    assert client.patch(f"/api/comments/{comment['id']}", json={"text": "x"}).status_code == 404


def test_soundbites_must_lie_inside_the_meeting(client: TestClient) -> None:
    meeting = _meeting(client)
    url = f"/api/meetings/{meeting['id']}/soundbites"

    later = client.post(url, json={"title": "Thanks", "start_ms": 60_000, "end_ms": 61_000})
    earlier = client.post(url, json={"title": "Beta date", "start_ms": 30_000, "end_ms": 45_000})

    assert later.status_code == earlier.status_code == 201
    detail = client.get(f"/api/meetings/{meeting['id']}").json()
    assert [clip["title"] for clip in detail["soundbites"]] == ["Beta date", "Thanks"]  # by start
    assert len(client.get(url).json()) == 2

    backwards = client.post(url, json={"title": "No", "start_ms": 5_000, "end_ms": 5_000})
    assert backwards.status_code == 422
    too_long = client.post(
        url, json={"title": "No", "start_ms": 0, "end_ms": meeting["duration_ms"] + 1}
    )
    assert too_long.status_code == 422
    assert too_long.json()["detail"] == "The soundbite ends after the meeting does"

    renamed = client.patch(f"/api/soundbites/{earlier.json()['id']}", json={"title": "Friday"})
    assert renamed.json()["title"] == "Friday"
    assert client.delete(f"/api/soundbites/{earlier.json()['id']}").status_code == 204
    assert client.delete(f"/api/soundbites/{earlier.json()['id']}").status_code == 404


def test_deleting_a_meeting_removes_its_annotations(client: TestClient, db: Session) -> None:
    meeting = _meeting(client)
    line_id = meeting["segments"][0]["id"]
    client.put(f"/api/segments/{line_id}/highlight", json={"color": "blue"})
    client.post(f"/api/segments/{line_id}/comments", json={"text": "Note"})
    client.post(
        f"/api/meetings/{meeting['id']}/soundbites",
        json={"title": "Clip", "start_ms": 0, "end_ms": 10_000},
    )

    assert client.delete(f"/api/meetings/{meeting['id']}").status_code == 204

    for model in (Highlight, SegmentComment, Soundbite):
        assert db.scalar(select(func.count()).select_from(model)) == 0, model.__name__
