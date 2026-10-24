import pytest
from app.db.database import init_db
from app.services.seed_data import seed_database
from app.services.temporal_engine import TemporalEngine
from app.schemas.models import TemporalSearchQuery

@pytest.fixture(scope="module")
def setup_db():
    init_db()
    seed_database()

def test_temporal_search_basic(setup_db):
    engine = TemporalEngine()
    resp = engine.search(TemporalSearchQuery(query="SUNBURST"))
    assert resp.total_results > 0
    assert any("SUNBURST" in it.snippet or "SUNBURST" in it.title for it in resp.items)

def test_point_in_time_search(setup_db):
    engine = TemporalEngine()
    # Before April 2021 (before CISA AA21-008A official attribution)
    resp_early = engine.search(TemporalSearchQuery(
        query="SolarWinds",
        as_of_time="2021-01-01T00:00:00Z"
    ))
    # After 2021 CISA announcement
    resp_late = engine.search(TemporalSearchQuery(
        query="SolarWinds",
        as_of_time="2022-01-01T00:00:00Z"
    ))
    assert len(resp_late.items) >= len(resp_early.items)
    # The early search must not have the April 2021 CISA report
    for it in resp_early.items:
        assert it.publication_time <= "2021-01-01T00:00:00Z"

def test_reconstruct_timeline(setup_db):
    engine = TemporalEngine()
    timeline = engine.reconstruct_timeline(entity_id="ent_apt29")
    assert len(timeline) > 0
    # Milestones must contain both event times and first reported times
    for ev in timeline:
        assert "event_time_start" in ev
        assert "first_reported_time" in ev
        assert ev["event_time_start"] is not None

def test_snapshot_diff_comparison(setup_db):
    engine = TemporalEngine()
    diff = engine.compare_snapshots(
        snapshot_a="2021-01-01T00:00:00Z",
        snapshot_b="2024-02-01T00:00:00Z"
    )
    # In between 2021 and 2024:
    # - Axie Infinity Ronin breach (2022)
    # - Microsoft Midnight Blizzard breach (2024)
    # - CISA AA21-008A attribution (April 2021)
    assert diff.summary["changed_relationships_count"] > 0
    assert diff.summary["revised_claims_count"] > 0
    assert len(diff.changed_relationships) > 0
    assert len(diff.revised_claims) > 0
