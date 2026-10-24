import pytest
from app.services.dedup_engine import (
    compute_sha256, compute_simhash, hamming_distance,
    is_near_duplicate, passage_shingle_jaccard, detect_syndication_and_circularity
)

def test_sha256_identical():
    t1 = "Threat actor deployed malicious wiper."
    t2 = "  Threat actor deployed malicious wiper.  "
    assert compute_sha256(t1) == compute_sha256(t2)

def test_simhash_near_duplicates():
    text1 = (
        "FireEye has uncovered a widespread campaign by an advanced threat actor, designated UNC2452. "
        "The actor inserted a backdoor into software updates of the SolarWinds Orion IT performance monitoring application. "
        "The trojanized component, SolarWinds.Orion.Core.BusinessLayer.dll, was digitally signed by SolarWinds between March and May 2020. "
        "Once delivered, the backdoor, dubbed SUNBURST, lies dormant for up to two weeks before resolving C2 servers disguised as avsvmcloud.com subdomains."
    )
    text2 = (
        "A widespread campaign by an advanced threat actor was uncovered today. "
        "The actor inserted a backdoor into software updates of the SolarWinds Orion IT performance monitoring application. "
        "The trojanized component, SolarWinds.Orion.Core.BusinessLayer.dll, was digitally signed by SolarWinds between March and May 2020. "
        "Once delivered, the backdoor, dubbed SUNBURST, lies dormant for up to two weeks before resolving C2 servers disguised as avsvmcloud.com subdomains."
    )
    h1 = compute_simhash(text1)
    h2 = compute_simhash(text2)
    dist = hamming_distance(h1, h2)
    assert dist <= 10
    assert is_near_duplicate(h1, h2, max_hamming_distance=10)

def test_simhash_dissimilar():
    text1 = "Axie Infinity validator keys compromised for $620 million in Ethereum."
    text2 = "Natanz uranium enrichment plant centrifuges damaged by Stuxnet worm."
    h1 = compute_simhash(text1)
    h2 = compute_simhash(text2)
    dist = hamming_distance(h1, h2)
    assert dist > 15

def test_detect_syndication_and_circularity():
    docs = [
        {
            "id": "doc_original",
            "title": "Zero-Day Attack on Satellite Modems",
            "source_name": "Primary Vendor Intel",
            "publication_time": "2022-03-01T12:00:00Z",
            "raw_content": "A destructive wiper targeted satellite broadband modems across Europe, knocking out remote monitoring for 5,800 wind turbines in Germany.",
            "is_syndicated": 0
        },
        {
            "id": "doc_echo",
            "title": "European Satellite Outage Linked to Wiper Attack",
            "source_name": "Secondary News Wire",
            "publication_time": "2022-03-02T08:00:00Z",
            "raw_content": "A destructive wiper targeted satellite broadband modems across Europe, knocking out remote monitoring for 5,800 wind turbines in Germany. Officials investigate.",
            "is_syndicated": 1,
            "canonical_source_id": "doc_original"
        }
    ]
    results = detect_syndication_and_circularity(docs)
    assert len(results["clusters"]) == 1
    assert len(results["circular_warnings"]) == 1
    warning = results["circular_warnings"][0]
    assert warning["original_source"] == "Primary Vendor Intel"
    assert warning["echo_source"] == "Secondary News Wire"
    assert "Do NOT treat this as independent secondary corroboration" in warning["warning"]
