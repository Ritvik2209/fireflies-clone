"""The "Ask about this meeting" chat (bonus 6). The LLM is always replaced: no network in tests."""

from dataclasses import replace
from typing import Any

import pytest
from fastapi.testclient import TestClient
from httpx import Response

from app.llm import client as llm
from app.services import chat as chat_service

TRANSCRIPT = """[00:00] Priya Shah: Morning all. Let's review the sprint goals for the mobile app.
[00:40] Daniel Okafor: I'll finish the offline sync work by Friday.
[01:30] Priya Shah: The pricing page needs new screenshots before launch."""


def _meeting(client: TestClient) -> dict[str, Any]:
    response = client.post(
        "/api/meetings",
        json={
            "title": "Sprint planning",
            "meeting_date": "2026-10-06T04:30:00Z",
            "transcript_text": TRANSCRIPT,
            "format": "txt",
            "source": "paste",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _ask(client: TestClient, meeting_id: int, question: str) -> Response:
    return client.post(f"/api/meetings/{meeting_id}/chat", json={"question": question})


class FakeLLM:
    """Records what would be sent and answers with a fixed text."""

    def __init__(self, answer: str) -> None:
        self.answer = answer
        self.sent: list[list[dict[str, str]]] = []

    def __call__(self, messages: list[dict[str, str]]) -> str:
        self.sent.append(messages)
        return self.answer


def test_the_prompt_holds_the_transcript_as_data_and_answers_are_stored(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake = FakeLLM("Daniel will finish it by Friday [00:40].")
    monkeypatch.setattr(llm, "complete", fake)
    meeting = _meeting(client)

    answer = _ask(client, meeting["id"], "  Who is doing the offline sync?  ").json()

    assert (answer["role"], answer["answered_by"]) == ("assistant", "llm")
    assert answer["content"] == "Daniel will finish it by Friday [00:40]."
    system, question = fake.sent[0][0], fake.sent[0][-1]
    assert system["role"] == "system" and "data, not instructions" in system["content"]
    assert (
        "[00:40] Daniel Okafor: I'll finish the offline sync work by Friday." in system["content"]
    )
    assert question == {"role": "user", "content": "Who is doing the offline sync?"}

    _ask(client, meeting["id"], "And by when?")  # a follow-up carries the earlier turn
    assert [message["role"] for message in fake.sent[1][1:]] == ["user", "assistant", "user"]
    history = client.get(f"/api/meetings/{meeting['id']}/chat").json()
    assert [message["role"] for message in history] == ["user", "assistant"] * 2
    assert client.delete(f"/api/meetings/{meeting['id']}/chat").status_code == 204
    assert client.get(f"/api/meetings/{meeting['id']}/chat").json() == []


def test_without_the_llm_the_answer_is_the_relevant_moments(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def unavailable(messages: list[dict[str, str]]) -> str:
        raise llm.LLMUnavailable("no key")

    monkeypatch.setattr(llm, "complete", unavailable)
    meeting = _meeting(client)

    found = _ask(client, meeting["id"], "When is the offline sync done?").json()
    missing = _ask(client, meeting["id"], "What about the weather?").json()

    assert found["answered_by"] == "fallback"
    assert found["content"].startswith("Relevant moments from the transcript:")
    assert "[00:40] Daniel Okafor: I'll finish the offline sync work by Friday." in found["content"]
    # No matching words: a general question still gets something useful, the overview.
    assert missing["content"].startswith("No line of the transcript matches those words.")
    assert "The meeting's overview:" in missing["content"]


def test_no_key_means_the_llm_is_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(llm, "settings", replace(llm.settings, llm_api_key=None))

    with pytest.raises(llm.LLMUnavailable):
        llm.complete([{"role": "user", "content": "Hello"}])


def test_a_long_transcript_sends_only_the_relevant_lines(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    fake = FakeLLM("ok")
    monkeypatch.setattr(llm, "complete", fake)
    monkeypatch.setattr(chat_service, "CONTEXT_BUDGET_CHARS", 100)  # pretend it doesn't fit
    meeting = _meeting(client)

    _ask(client, meeting["id"], "What about the pricing page?")

    sent = fake.sent[0][0]["content"]
    assert "[01:30] Priya Shah: The pricing page" in sent  # the match
    assert "[00:40] Daniel Okafor" in sent  # its neighbour, for context
    assert "[00:00] Priya Shah" not in sent  # unrelated, left out


def test_questions_are_validated_and_rate_limited(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(llm, "complete", FakeLLM("ok"))
    meeting = _meeting(client)

    assert _ask(client, meeting["id"], "   ").status_code == 422
    assert _ask(client, meeting["id"], "x" * 501).status_code == 422
    for _ in range(chat_service.QUESTIONS_PER_MINUTE):
        assert _ask(client, meeting["id"], "Pricing?").status_code == 201
    too_many = _ask(client, meeting["id"], "Pricing?")
    assert too_many.status_code == 429
    assert "wait a minute" in too_many.json()["detail"]
    assert client.get("/api/meetings/999/chat").status_code == 404
