"""Helpers shared by the API tests."""

from typing import Any

from fastapi.testclient import TestClient


def create_meeting(client: TestClient, body: dict[str, Any]) -> dict[str, Any]:
    """Creates a meeting and returns it as GET shows it once its transcript is processed.

    POST answers 202 with the meeting still "processing" (Extra 3). TestClient runs background
    tasks before post() returns, so by the time we GET the meeting, the job has finished.
    """
    response = client.post("/api/meetings", json=body)
    assert response.status_code == 202, response.text
    assert response.json()["status"] == "processing"
    return client.get(f"/api/meetings/{response.json()['id']}").json()
