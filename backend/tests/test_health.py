from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import health as health_service

client = TestClient(app)


def test_health_reports_ok_and_fts5() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["fts5"] is True
    assert body["sqlite_version"]


def test_health_says_whether_an_llm_key_is_set_but_never_shows_it(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with_key = replace(health_service.settings, llm_api_key="gsk_secret")
    monkeypatch.setattr(health_service, "settings", with_key)
    response = client.get("/api/health")

    assert response.json()["llm_configured"] is True
    assert "gsk_secret" not in response.text

    monkeypatch.setattr(health_service, "settings", replace(with_key, llm_api_key=None))
    assert client.get("/api/health").json()["llm_configured"] is False


def test_cors_allows_the_configured_frontend_origin() -> None:
    response = client.get("/api/health", headers={"Origin": "http://localhost:3000"})

    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_cors_does_not_allow_other_origins() -> None:
    response = client.get("/api/health", headers={"Origin": "https://evil.example"})

    assert "access-control-allow-origin" not in response.headers


def test_root_redirects_to_docs() -> None:
    response = client.get("/", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == "/docs"
