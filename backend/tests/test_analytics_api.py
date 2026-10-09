"""Speaker analytics (Extra 2), checked on hand-built transcripts whose numbers are known."""

import json
from typing import Any

from fastapi.testclient import TestClient

# Ann: two back-to-back lines (one 20 s turn), then a zero-length "Really?" and a 15 s line,
# which together make a second, 15 s turn. Ben: one 40 s line. Cy: one zero-length line.
LINES = [
    {"speaker": "Ann Lee", "start": 0, "end": 10, "text": "Welcome back everyone."},
    {"speaker": "Ann Lee", "start": 10, "end": 20, "text": "Shall we start with the budget?"},
    {
        "speaker": "Ben Ito",
        "start": 20,
        "end": 60,
        "text": "Yes. The budget is on track, and hiring is ahead of plan.",
    },
    {"speaker": "Ann Lee", "start": 60, "end": 60, "text": "Really?"},
    {"speaker": "Ann Lee", "start": 60, "end": 75, "text": "Then let's move on to the roadmap."},
    {"speaker": "Cy Park", "start": 75, "end": 75, "text": "Agreed."},
]


def _create(client: TestClient, lines: list[dict[str, Any]], participants: list[str]) -> int:
    response = client.post(
        "/api/meetings",
        json={
            "title": "Analytics test",
            "meeting_date": "2026-10-09T09:00:00Z",
            "participants": participants,
            "transcript_text": json.dumps(lines),
            "format": "json",
            "source": "paste",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_talk_time_words_questions_and_monologues(client: TestClient) -> None:
    meeting_id = _create(client, LINES, participants=["Dee Ray"])  # Dee never speaks

    body = client.get(f"/api/meetings/{meeting_id}/analytics").json()

    assert body["total_talk_time_ms"] == 75_000
    assert body["speaker_count"] == 3  # only people who speak
    assert body["dominant_speaker"] == "Ben Ito"
    stats = {speaker["name"]: speaker for speaker in body["speakers"]}
    assert [speaker["name"] for speaker in body["speakers"]] == ["Ben Ito", "Ann Lee", "Cy Park"]
    ben = stats["Ben Ito"]
    assert (ben["talk_time_ms"], ben["talk_percent"], ben["segment_count"]) == (40_000, 53.3, 1)
    assert (ben["word_count"], ben["words_per_minute"], ben["question_count"]) == (12, 18, 0)
    assert ben["longest_monologue_ms"] == 40_000
    ann = stats["Ann Lee"]
    assert (ann["talk_time_ms"], ann["talk_percent"], ann["segment_count"]) == (35_000, 46.7, 4)
    assert (ann["word_count"], ann["words_per_minute"], ann["question_count"]) == (17, 29, 2)
    assert ann["longest_monologue_ms"] == 20_000  # the back-to-back opening lines, merged
    # A zero-length line: counted, but no talk time, and no division by zero.
    cy = stats["Cy Park"]
    assert (cy["talk_time_ms"], cy["talk_percent"], cy["words_per_minute"]) == (0, 0.0, 0)
    assert (cy["segment_count"], cy["word_count"], cy["longest_monologue_ms"]) == (1, 1, 0)


def test_a_single_speaker_has_all_the_talk_time(client: TestClient) -> None:
    _create(client, LINES, participants=[])  # another meeting's lines must not be counted
    solo = [
        {"speaker": "Ann Lee", "start": 0, "end": 30, "text": "Quick update from me today."},
        {"speaker": "Ann Lee", "start": 30, "end": 45, "text": "Any questions?"},
    ]
    meeting_id = _create(client, solo, participants=[])

    body = client.get(f"/api/meetings/{meeting_id}/analytics").json()

    assert (body["total_talk_time_ms"], body["speaker_count"]) == (45_000, 1)
    assert body["dominant_speaker"] == "Ann Lee"
    (ann,) = body["speakers"]
    assert (ann["talk_percent"], ann["segment_count"], ann["question_count"]) == (100.0, 2, 1)
    assert (ann["word_count"], ann["words_per_minute"]) == (7, 9)  # 7 words in 45 s
    assert ann["longest_monologue_ms"] == 45_000  # one turn, start to end


def test_unknown_meeting_is_404(client: TestClient) -> None:
    response = client.get("/api/meetings/999/analytics")

    assert response.status_code == 404
    assert response.json() == {"detail": "Meeting 999 not found"}
