import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import init_db
from app.services.seed_data import seed_database

@pytest.fixture(scope="module")
def client():
    init_db()
    seed_database()
    with TestClient(app) as c:
        yield c

def test_health_and_status(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    res = client.get("/api/status")
    assert res.status_code == 200
    metrics = res.json()["metrics"]
    assert metrics["documents_count"] >= 10
    assert metrics["entities_count"] >= 10

def test_api_search(client):
    payload = {"query": "NotPetya"}
    res = client.post("/api/search", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total_results"] > 0
    assert any("Sandworm" in it["snippet"] or "NotPetya" in it["snippet"] or "MeDoc" in it["snippet"] for it in data["items"])

def test_api_timeline(client):
    res = client.get("/api/timeline?entity_id=ent_apt29")
    assert res.status_code == 200
    events = res.json()
    assert len(events) > 0
    assert "event_time_start" in events[0]

def test_api_graph(client):
    res = client.get("/api/graph")
    assert res.status_code == 200
    data = res.json()
    assert data["total_nodes"] > 5
    assert data["total_edges"] > 3

def test_api_diff(client):
    payload = {
        "snapshot_a_time": "2021-01-01T00:00:00Z",
        "snapshot_b_time": "2024-02-01T00:00:00Z"
    }
    res = client.post("/api/diff", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["changed_relationships"]) > 0
    assert len(data["revised_claims"]) > 0

def test_api_sources(client):
    res = client.get("/api/sources")
    assert res.status_code == 200
    data = res.json()
    assert len(data["sources"]) > 0
    assert len(data["syndication_clusters"]) > 0

def test_api_workspace_and_export(client):
    # 1. Create workspace
    create_res = client.post("/api/workspaces", json={
        "title": "Operation Olympic Games Deep Dive",
        "description": "Analyzing early Stuxnet centrifuge sabotage evidence",
        "analyst_name": "Senior Researcher"
    })
    assert create_res.status_code == 200
    ws = create_res.json()
    ws_id = ws["id"]

    # 2. Pin item
    item_res = client.post(f"/api/workspaces/{ws_id}/items", json={
        "item_type": "entity",
        "item_id": "ent_stuxnet",
        "analyst_note": "Weaponized worm targeting Natanz enrichment facility",
        "hypothesis_stance": "supports_hypothesis"
    })
    assert item_res.status_code == 200

    # 3. Add note
    note_res = client.post(f"/api/workspaces/{ws_id}/notes", json={
        "title": "Technical Assessment of IR-1 Disruption",
        "content": "Frequency alteration caused mechanical resonance in centrifuges."
    })
    assert note_res.status_code == 200

    # 4. Export Markdown
    md_res = client.get(f"/api/workspaces/{ws_id}/export/markdown")
    assert md_res.status_code == 200
    assert "OPERATION OLYMPIC GAMES DEEP DIVE" in md_res.text or "Operation Olympic Games Deep Dive" in md_res.text
    assert "Natanz" in md_res.text or "Stuxnet" in md_res.text

    # 5. Export HTML
    html_res = client.get(f"/api/workspaces/{ws_id}/export/html")
    assert html_res.status_code == 200
    assert "<html" in html_res.text
    assert "HISTORYFATHER // INTELLIGENCE DOSSIER" in html_res.text

def test_api_ingestion(client):
    new_report = {
        "title": "Citizen Lab: New Predator Spyware Discovered",
        "source_name": "Citizen Lab Research",
        "source_url": "https://citizenlab.ca/predator-2023",
        "source_type": "technical_paper",
        "publication_time": "2023-10-01T12:00:00Z",
        "content": "A newly identified commercial spyware product named Predator has been observed targeting journalists across the Mediterranean. Technical indicators show shared infrastructure with Cytrox and Intellexa alliances.",
        "reliability_tier": "independent_research"
    }
    ingest_res = client.post("/api/ingest", json=new_report)
    assert ingest_res.status_code == 200
    data = ingest_res.json()
    assert data["document_id"] is not None
    assert data["passages_count"] >= 1
