import pytest
from app.db.database import init_db
from app.services.seed_data import seed_database
from app.services.graph_engine import TemporalGraphEngine

@pytest.fixture(scope="module")
def setup_db():
    init_db()
    seed_database()

def test_full_graph_projection(setup_db):
    engine = TemporalGraphEngine()
    graph = engine.get_graph()
    assert graph.total_nodes > 0
    assert graph.total_edges > 0

    node_ids = {n.id for n in graph.nodes}
    assert "ent_apt29" in node_ids
    assert "ent_sandworm" in node_ids

def test_ego_subgraph(setup_db):
    engine = TemporalGraphEngine()
    ego = engine.get_graph(entity_id="ent_apt29", hops=1)
    node_ids = {n.id for n in ego.nodes}
    assert "ent_apt29" in node_ids
    # Sandworm should NOT be in 1-hop neighborhood of APT29
    assert "ent_sandworm" not in node_ids

def test_path_finding(setup_db):
    engine = TemporalGraphEngine()
    path = engine.find_path("ent_apt29", "ent_solarwinds")
    assert len(path) >= 1
    assert path[0]["from_node"] == "ent_apt29"
    assert path[0]["to_node"] == "ent_solarwinds"

def test_edge_evidence_traceability(setup_db):
    engine = TemporalGraphEngine()
    evidence = engine.get_edge_evidence("rel_apt29_deploys_sunburst")
    assert len(evidence) >= 1
    ev0 = evidence[0]
    assert ev0.verbatim_quote is not None
    assert len(ev0.verbatim_quote) > 10
    assert ev0.source_name is not None
    assert ev0.publication_time is not None
