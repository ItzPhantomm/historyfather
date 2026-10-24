import pytest
from app.db.database import init_db
from app.services.seed_data import seed_database
from app.services.entity_resolution import EntityResolver, normalize_name, jaro_winkler_similarity

@pytest.fixture(scope="module")
def setup_db():
    init_db()
    seed_database()

def test_normalization():
    assert normalize_name("APT-29!") == "apt29"
    assert normalize_name("Cozy Bear (SVR)") == "cozy bear svr"

def test_jaro_winkler_metric():
    assert jaro_winkler_similarity("Midnight Blizzard", "Midnight Blizzard") == 1.0
    sim = jaro_winkler_similarity("Midnight Blizzard", "MidnightBlizzard")
    assert sim > 0.90

def test_resolve_exact_alias(setup_db):
    resolver = EntityResolver()
    matches = resolver.resolve_term("Midnight Blizzard")
    assert len(matches) > 0
    top = matches[0]
    assert top.canonical_name == "APT29"
    assert top.match_strategy in ("exact_alias", "exact_canonical")
    assert top.similarity_score >= 0.95
    assert "APT29" in top.explanation_text

def test_resolve_fuzzy_term(setup_db):
    resolver = EntityResolver()
    # Slight typo "Voodo Bear" -> "Voodoo Bear" (Sandworm)
    matches = resolver.resolve_term("Voodo Bear")
    assert len(matches) > 0
    found_sandworm = any(m.canonical_name == "Sandworm Team" for m in matches)
    assert found_sandworm

def test_get_entity_cluster(setup_db):
    resolver = EntityResolver()
    cluster = resolver.get_entity_cluster("ent_apt29")
    assert cluster is not None
    assert cluster["canonical_name"] == "APT29"
    assert len(cluster["aliases"]) >= 4
    alias_names = [a["alias"] for a in cluster["aliases"]]
    assert "Cozy Bear" in alias_names
    assert "Nobelium" in alias_names
