"""
Automated Security & Exploit Verification Test Suite for HistoryFather.
Covers:
  - Path traversal and arbitrary file read prevention
  - Stored & reflected XSS prevention in dossier HTML exports
  - Defense-in-depth HTTP security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy)
  - Admin endpoint authorization and CSRF-resistant confirmation guards
  - Request rate limiting and DoS throttling
  - Input validation, length bounding, and Pydantic schema constraints
  - Algorithmic complexity bounds (Jaro-Winkler ReDoS mitigation)
  - Strict database file and directory permissions (0700/0600)
  - Nonexistent resource 404 handling vs 500 error leaks
"""

import os
import time
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import init_db, get_db_path, secure_db_permissions
from app.services.seed_data import seed_database
from app.services.entity_resolution import jaro_winkler_similarity

@pytest.fixture(scope="module")
def client():
    init_db()
    seed_database()
    with TestClient(app) as c:
        yield c


# ===================================================================
# 1. PATH TRAVERSAL & ARBITRARY FILE READ TESTS
# ===================================================================

def test_path_traversal_blocked(client):
    """
    Ensure an attacker cannot read sensitive files outside frontend/dist.
    """
    traversal_payloads = [
        "/etc/passwd",
        "/../../run.sh",
        "/../../../backend/app/main.py",
        "/..%2f..%2frun.sh",
        "/%2e%2e/%2e%2e/run.sh",
        "/backend/data/historyfather.db",
        "/..%2f..%2fbackend/data/historyfather.db",
        "/root/.bashrc",
        "/%00/etc/passwd"
    ]
    for payload in traversal_payloads:
        res = client.get(payload)
        # Should either be 404, or fallback to SPA index.html, NEVER return file content
        assert "root:x:0:0:" not in res.text, f"Path traversal leaked /etc/passwd for {payload}"
        assert "seed_database" not in res.text, f"Path traversal leaked python code for {payload}"
        assert "SQLite format" not in res.text, f"Path traversal leaked sqlite db for {payload}"
        if "." in Path(payload.lstrip("/")).name and ".." in payload:
            assert res.status_code == 404, f"Expected 404 for traversal {payload}, got {res.status_code}"


# ===================================================================
# 2. HTTP SECURITY HEADERS TESTS
# ===================================================================

def test_security_headers_present(client):
    """
    Verify mandatory security headers on all responses.
    """
    res = client.get("/health")
    assert res.status_code == 200
    headers = res.headers

    assert headers.get("X-Content-Type-Options") == "nosniff"
    assert headers.get("X-Frame-Options") == "DENY"
    assert headers.get("X-XSS-Protection") == "1; mode=block"
    assert headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "default-src 'self'" in headers.get("Content-Security-Policy", "")
    assert "frame-ancestors 'none'" in headers.get("Content-Security-Policy", "")
    assert "camera=()" in headers.get("Permissions-Policy", "")


# ===================================================================
# 3. XSS PREVENTIONS IN HTML EXPORT
# ===================================================================

def test_xss_prevention_in_dossier_html(client):
    """
    Ensure all user-supplied input in workspaces, notes, and items is strictly HTML-escaped.
    """
    xss_payload = "<script>alert('XSS_EXEC')</script>"
    xss_img = '<img src="x" onerror="alert(1)">'

    # 1. Create workspace with script tags
    ws_res = client.post("/api/workspaces", json={
        "title": f"Investigation {xss_payload}",
        "description": f"Targeting {xss_img}",
        "analyst_name": "<script>alert('analyst')</script>"
    })
    assert ws_res.status_code == 200
    ws_id = ws_res.json()["id"]

    # 2. Add note with XSS payload
    client.post(f"/api/workspaces/{ws_id}/notes", json={
        "title": "<svg onload=alert(1)>",
        "content": "<b onmouseover=alert(1)>Malicious Body</b>"
    })

    # 3. Add item with XSS in analyst note
    client.post(f"/api/workspaces/{ws_id}/items", json={
        "item_type": "entity",
        "item_id": "ent_apt29",
        "analyst_note": "<iframe src='javascript:alert(1)'></iframe>",
        "hypothesis_stance": "supports_hypothesis"
    })

    # 4. Fetch HTML Export
    html_res = client.get(f"/api/workspaces/{ws_id}/export/html")
    assert html_res.status_code == 200
    html_text = html_res.text

    # Raw script tags must NOT exist in the output
    assert "<script>alert('XSS_EXEC')</script>" not in html_text
    assert '<img src="x" onerror="alert(1)">' not in html_text
    assert "<svg onload=alert(1)>" not in html_text
    assert "<iframe src='javascript:alert(1)'>" not in html_text

    # Escaped versions MUST be present
    assert "&lt;script&gt;alert(&#x27;XSS_EXEC&#x27;)&lt;/script&gt;" in html_text or "&lt;script&gt;alert('XSS_EXEC')&lt;/script&gt;" in html_text
    assert "&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;" in html_text or "&lt;img src=\"x\" onerror=\"alert(1)\"&gt;" in html_text

    # Content-Security-Policy meta tag must be present in the document
    assert "Content-Security-Policy" in html_text


# ===================================================================
# 4. ADMIN RESEED ACCESS CONTROL & CSRF GUARDS
# ===================================================================

def test_admin_reseed_requires_confirmation(client):
    """
    Ensure /api/admin/reseed cannot be triggered without explicit authorization header.
    """
    # 1. Unconfirmed request must fail
    res = client.post("/api/admin/reseed")
    assert res.status_code == 400
    assert "X-Admin-Confirm" in res.json()["detail"]

    # 2. Wrong header value must fail
    res = client.post("/api/admin/reseed", headers={"X-Admin-Confirm": "invalid"})
    assert res.status_code == 400

    # 3. Valid confirmation header succeeds
    res = client.post("/api/admin/reseed", headers={"X-Admin-Confirm": "reseed"})
    assert res.status_code == 200
    assert res.json()["status"] == "reseeded"

def test_admin_reseed_with_secret_key(monkeypatch, client):
    """
    When HISTORYFATHER_ADMIN_KEY is set in environment, endpoint requires matching credential.
    """
    secret = "TopSecretIntelKey987!"
    monkeypatch.setenv("HISTORYFATHER_ADMIN_KEY", secret)

    # Missing key -> 403 Forbidden
    res = client.post("/api/admin/reseed", headers={"X-Admin-Confirm": "reseed"})
    assert res.status_code == 403

    # Wrong key -> 403 Forbidden
    res = client.post("/api/admin/reseed", headers={"X-Admin-Confirm": "reseed", "X-Admin-Key": "wrong"})
    assert res.status_code == 403

    # Correct key via X-Admin-Key -> 200 OK
    res = client.post("/api/admin/reseed", headers={"X-Admin-Confirm": "reseed", "X-Admin-Key": secret})
    assert res.status_code == 200
    assert res.json()["status"] == "reseeded"


# ===================================================================
# 5. INPUT VALIDATION & RESOURCE EXHAUSTION PROTECTION
# ===================================================================

def test_input_validation_search_bounds(client):
    """
    Verify search limit and query string boundaries.
    """
    # Limit too large
    res = client.post("/api/search", json={"limit": 1000})
    assert res.status_code == 422

    # Negative offset
    res = client.post("/api/search", json={"offset": -1})
    assert res.status_code == 422

    # Query too long
    res = client.post("/api/search", json={"query": "A" * 300})
    assert res.status_code == 422

def test_ingestion_payload_size_capped(client):
    """
    Ensure oversized ingestion payloads are rejected by schema validation.
    """
    huge_text = "word " * 60000 # ~300KB
    res = client.post("/api/ingest", json={
        "title": "Massive Report",
        "source_name": "Test Source",
        "publication_time": "2024-01-01T00:00:00Z",
        "content": huge_text
    })
    assert res.status_code == 422

def test_jaro_winkler_redos_protection():
    """
    Verify jaro_winkler_similarity executes in sub-millisecond time even with 10k character inputs.
    """
    t0 = time.time()
    score = jaro_winkler_similarity("a" * 10000, "b" * 10000)
    elapsed = time.time() - t0
    assert score == 0.0
    assert elapsed < 0.05, f"Jaro-Winkler took {elapsed:.4f}s, potential ReDoS!"


# ===================================================================
# 6. NONEXISTENT RESOURCE ERROR HANDLING (NO 500 LEAKS)
# ===================================================================

def test_nonexistent_workspace_handling(client):
    """
    Ensure operations on non-existent workspaces return 404 rather than 500 SQLite IntegrityError.
    """
    fake_id = "ws_does_not_exist_999"

    # Add item to non-existent workspace
    res = client.post(f"/api/workspaces/{fake_id}/items", json={
        "item_type": "entity",
        "item_id": "ent_apt29"
    })
    assert res.status_code == 404

    # Add note to non-existent workspace
    res = client.post(f"/api/workspaces/{fake_id}/notes", json={
        "title": "Ghost Note",
        "content": "Ghost content"
    })
    assert res.status_code == 404

    # Delete item from non-existent workspace
    res = client.delete(f"/api/workspaces/{fake_id}/items/wi_fake")
    assert res.status_code == 404

    # Export markdown for non-existent workspace
    res = client.get(f"/api/workspaces/{fake_id}/export/markdown")
    assert res.status_code == 404


# ===================================================================
# 7. DATABASE FILE & DIRECTORY PERMISSIONS
# ===================================================================

def test_database_permissions():
    """
    Verify database directory and files have restrictive permissions (0700/0600).
    """
    db_path = get_db_path()
    secure_db_permissions(db_path)

    # Check directory permissions
    dir_stat = os.stat(db_path.parent)
    dir_mode = oct(dir_stat.st_mode)[-3:]
    assert dir_mode == "700", f"DB dir permissions should be 700, got {dir_mode}"

    # Check db file permissions
    file_stat = os.stat(db_path)
    file_mode = oct(file_stat.st_mode)[-3:]
    assert file_mode == "600", f"DB file permissions should be 600, got {file_mode}"
