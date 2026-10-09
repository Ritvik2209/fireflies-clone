"""Export (bonus 3): transcript and notes as TXT, Markdown and PDF downloads."""

from typing import Any

from fastapi.testclient import TestClient
from httpx import Response

TRANSCRIPT = """[00:00] Priya Shah: Morning all. Let's review the sprint goals for the mobile app.
[00:40] Daniel Okafor: I'll finish the offline sync work by Friday.
[01:30] Zoë Ångström: Привет! I can test it on Android devices next week."""


def _meeting(client: TestClient) -> dict[str, Any]:
    response = client.post(
        "/api/meetings",
        json={
            "title": "Sprint planning: Q4!",
            "meeting_date": "2026-10-06T04:30:00Z",
            "transcript_text": TRANSCRIPT,
            "format": "txt",
            "source": "paste",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _export(client: TestClient, meeting_id: int, content: str, fmt: str) -> Response:
    return client.get(f"/api/meetings/{meeting_id}/export?content={content}&format={fmt}")


def test_transcript_txt_downloads_and_imports_back(client: TestClient) -> None:
    meeting = _meeting(client)

    response = _export(client, meeting["id"], "transcript", "txt")

    assert response.status_code == 200
    assert response.headers["content-type"] == "text/plain; charset=utf-8"
    assert response.headers["content-disposition"] == (
        'attachment; filename="sprint-planning-q4-transcript.txt"'
    )
    text = response.text
    assert "Tue, 06 Oct 2026, 04:30 UTC" in text
    assert "[00:40] Daniel Okafor: I'll finish the offline sync work by Friday." in text

    # The transcript lines use the .txt upload format, so the export can be uploaded again.
    lines = "\n".join(line for line in text.splitlines() if line.startswith("["))
    again = client.post(
        "/api/meetings",
        json={
            "title": "Re-imported",
            "meeting_date": "2026-10-07T04:30:00Z",
            "transcript_text": lines,
            "format": "txt",
            "source": "upload",
        },
    )
    assert again.status_code == 201
    assert [s["text"] for s in again.json()["segments"]] == [s["text"] for s in meeting["segments"]]


def test_summary_markdown_has_every_section(client: TestClient) -> None:
    meeting = _meeting(client)
    item = meeting["action_items"][0]
    client.patch(f"/api/action-items/{item['id']}", json={"is_completed": True})

    markdown = _export(client, meeting["id"], "summary", "md").text

    assert markdown.startswith("# Sprint planning: Q4!\n")
    for heading in ("## Overview", "## Keywords", "## Chapters", "## Action items"):
        assert heading in markdown
    assert f"- [x] {item['text']}" in markdown  # completed items are ticked task-list entries
    assert "\n\n\n" not in markdown  # one blank line between blocks


def test_pdf_handles_text_beyond_latin_1(client: TestClient) -> None:
    meeting = _meeting(client)

    for content in ("transcript", "summary"):
        response = _export(client, meeting["id"], content, "pdf")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert response.content.startswith(b"%PDF")


def test_export_validates_input(client: TestClient) -> None:
    meeting = _meeting(client)

    assert _export(client, meeting["id"], "transcript", "docx").status_code == 422
    assert _export(client, meeting["id"], "video", "txt").status_code == 422
    assert _export(client, 999, "transcript", "txt").status_code == 404


def test_browsers_may_read_the_filename(client: TestClient) -> None:
    meeting = _meeting(client)

    response = client.get(
        f"/api/meetings/{meeting['id']}/export?content=summary&format=txt",
        headers={"Origin": "http://localhost:3000"},
    )

    # Cross-origin JavaScript can only read headers the server exposes.
    assert response.headers["access-control-expose-headers"] == "Content-Disposition"
