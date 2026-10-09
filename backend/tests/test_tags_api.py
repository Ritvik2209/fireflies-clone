"""Tags (bonus 2): the /api/tags endpoints, assigning tags to meetings and filtering by tag."""

from typing import Any

from fastapi.testclient import TestClient

from app.models.tag import TAG_COLORS

TRANSCRIPT = "[00:00] Priya Shah: Let's review the launch.\n[00:30] Sam Rivera: Sounds good."


def _meeting(client: TestClient, title: str) -> dict[str, Any]:
    response = client.post(
        "/api/meetings",
        json={
            "title": title,
            "meeting_date": "2026-10-06T04:30:00Z",
            "transcript_text": TRANSCRIPT,
            "format": "txt",
            "source": "paste",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _tag(client: TestClient, name: str, color: str | None = None) -> dict[str, Any]:
    response = client.post("/api/tags", json={"name": name, "color": color})
    assert response.status_code == 201, response.text
    return response.json()


def _tag_names(meeting: dict[str, Any]) -> list[str]:
    return [tag["name"] for tag in meeting["tags"]]


def test_create_list_and_delete_tags(client: TestClient) -> None:
    sales = _tag(client, "Sales", "orange")
    customer = _tag(client, "  Customer   call ")

    assert sales["color"] == "orange"
    assert customer["name"] == "Customer call"  # whitespace tidied
    assert customer["color"] in TAG_COLORS  # no colour sent: picked from the name
    names = [tag["name"] for tag in client.get("/api/tags").json()]
    assert names == ["Customer call", "Sales"]

    assert client.delete(f"/api/tags/{sales['id']}").status_code == 204
    assert [tag["name"] for tag in client.get("/api/tags").json()] == ["Customer call"]
    assert client.delete(f"/api/tags/{sales['id']}").status_code == 404


def test_tag_names_are_unique_ignoring_case_and_validated(client: TestClient) -> None:
    _tag(client, "Sales")

    duplicate = client.post("/api/tags", json={"name": "sales"})
    assert duplicate.status_code == 409
    assert "already exists" in duplicate.json()["detail"]
    assert client.post("/api/tags", json={"name": "   "}).status_code == 422
    assert client.post("/api/tags", json={"name": "x" * 41}).status_code == 422
    assert client.post("/api/tags", json={"name": "Teal", "color": "teal"}).status_code == 422


def test_assign_tags_filter_by_tag_and_delete_a_tag(client: TestClient) -> None:
    launch = _meeting(client, "Launch review")
    retro = _meeting(client, "Retro")
    product = _tag(client, "Product")
    urgent = _tag(client, "Urgent")

    patched = client.patch(
        f"/api/meetings/{launch['id']}", json={"tag_ids": [urgent["id"], product["id"]]}
    )
    assert patched.status_code == 200
    assert _tag_names(patched.json()) == ["Product", "Urgent"]  # sorted by name
    client.patch(f"/api/meetings/{retro['id']}", json={"tag_ids": [urgent["id"]]})

    def titles(tag_id: int) -> list[str]:
        response = client.get("/api/meetings", params={"tag_id": tag_id, "sort": "oldest"})
        return [meeting["title"] for meeting in response.json()]

    assert titles(product["id"]) == ["Launch review"]
    assert titles(urgent["id"]) == ["Launch review", "Retro"]
    library = client.get("/api/meetings").json()
    assert all("tags" in meeting for meeting in library)  # list rows carry their tags

    unknown = client.patch(f"/api/meetings/{launch['id']}", json={"tag_ids": [999]})
    assert unknown.status_code == 422
    assert unknown.json()["detail"] == "Unknown tag id: 999"
    assert client.patch(f"/api/meetings/{launch['id']}", json={"tag_ids": None}).status_code == 422

    # Deleting a tag removes it from meetings; the meetings themselves stay.
    assert client.delete(f"/api/tags/{urgent['id']}").status_code == 204
    retro_after = client.get(f"/api/meetings/{retro['id']}")
    assert retro_after.status_code == 200
    assert _tag_names(retro_after.json()) == []
    assert _tag_names(client.get(f"/api/meetings/{launch['id']}").json()) == ["Product"]

    cleared = client.patch(f"/api/meetings/{launch['id']}", json={"tag_ids": []})
    assert _tag_names(cleared.json()) == []
