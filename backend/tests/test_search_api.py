"""Global search (bonus 4): FTS5 over transcript lines, kept in sync by triggers."""

from typing import Any

from fastapi.testclient import TestClient
from helpers import create_meeting
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import init_db
from app.models.participant import AVATAR_COLORS

PILOT = """[00:00] Priya Shah: Let's talk about pricing for the pilot.
[00:30] Sam Rivera: The price looks fine. Don't forget the budget.
[01:00] Priya Shah: An unrelated line about the weather."""
RETRO = """[00:00] Dev Patel: Pricing was priced too high last year.
[00:20] Dev Patel: Nothing else to add."""


def _meeting(client: TestClient, title: str, transcript: str) -> dict[str, Any]:
    return create_meeting(
        client,
        {
            "title": title,
            "meeting_date": "2026-10-06T04:30:00Z",
            "transcript_text": transcript,
            "format": "txt",
            "source": "paste",
        },
    )


def _search(client: TestClient, query: str) -> list[dict[str, Any]]:
    response = client.get("/api/search", params={"q": query})
    assert response.status_code == 200, (query, response.text)
    return response.json()


def test_finds_word_forms_across_meetings_best_first(client: TestClient) -> None:
    _meeting(client, "Pilot call", PILOT)
    _meeting(client, "Retro", RETRO)

    hits = _search(client, "pricing")

    # Porter stemming: "pricing", "price" and "priced" are all the same word.
    assert {(hit["meeting_title"], hit["start_ms"]) for hit in hits} == {
        ("Pilot call", 0),
        ("Pilot call", 30_000),
        ("Retro", 0),
    }
    best = hits[0]  # bm25: two matches in a short line beat one
    assert (best["meeting_title"], best["speaker_name"]) == ("Retro", "Dev Patel")
    assert best["speaker_color"] in AVATAR_COLORS
    assert best["snippet"] == "\x02Pricing\x03 was \x02priced\x03 too high last year."
    assert best["meeting_date"] == "2026-10-06T04:30:00Z"


def test_every_word_must_appear_and_odd_input_is_safe(client: TestClient) -> None:
    _meeting(client, "Pilot call", PILOT)

    assert [hit["start_ms"] for hit in _search(client, "price budget")] == [30_000]
    assert [hit["start_ms"] for hit in _search(client, "don't")] == [30_000]
    # Raw, these are FTS5 syntax errors; quoted word by word they are just text.
    for odd in ['"', "(", "budget AND", "NEAR(price", "price OR", "a:b", "*", "-price"]:
        _search(client, odd)
    assert _search(client, "   ") == []
    assert client.get("/api/search", params={"q": ""}).status_code == 422


def test_the_index_follows_creates_and_deletes(client: TestClient) -> None:
    meeting = _meeting(client, "Pilot call", PILOT)
    assert len(_search(client, "weather")) == 1  # indexed by the insert trigger

    client.delete(f"/api/meetings/{meeting['id']}")

    assert _search(client, "weather") == []  # removed by the delete trigger


def test_startup_rebuild_indexes_lines_written_before_the_index(
    client: TestClient, db: Session
) -> None:
    _meeting(client, "Pilot call", PILOT)
    db.execute(text("INSERT INTO segments_fts (segments_fts) VALUES ('delete-all')"))
    db.commit()
    assert _search(client, "weather") == []

    init_db()  # runs on every start, including 'rebuild'

    assert len(_search(client, "weather")) == 1
