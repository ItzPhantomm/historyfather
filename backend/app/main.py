"""
HistoryFather - Main FastAPI Application.
Hardened with comprehensive security controls:
  - Path traversal protection for static asset delivery
  - Defense-in-depth security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy)
  - Strict input validation and query bounding
  - In-memory rate limiting and request throttling
  - Admin authentication & CSRF-resistant action confirmation
  - Safe error handling without stack trace leakage
  - Sanitized file attachment and export headers
"""

import os
import re
import time
import html
import logging
import sqlite3
from pathlib import Path
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Query, Path as FPath, Response, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, PlainTextResponse, FileResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.db.database import init_db, get_connection
from app.schemas.models import (
    TemporalSearchQuery, SearchResponse, GraphResponse,
    TemporalDiffRequest, TemporalDiffResponse,
    SourceIntelligenceResponse, WorkspaceCreate, WorkspaceDetail,
    WorkspaceItemAdd, WorkspaceNoteCreate, IngestDocumentRequest, IngestDocumentResponse,
    EntityModel, RelationshipEvidenceModel, EntityMatchExplanation
)
from app.services.temporal_engine import TemporalEngine
from app.services.entity_resolution import EntityResolver
from app.services.graph_engine import TemporalGraphEngine
from app.services.source_intelligence import SourceIntelligenceService
from app.services.dossier_engine import DossierEngine
from app.services.ingestion import IngestionPipeline
from app.services.seed_data import seed_database

logger = logging.getLogger("historyfather.security")
logging.basicConfig(level=logging.INFO)

# ==========================================
# 1. SECURITY & RATE LIMITING MIDDLEWARE
# ==========================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Injects defense-in-depth HTTP security headers into all responses.
    """
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Standard OWASP recommended headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
            "magnetometer=(), microphone=(), payment=(), usb=()"
        )
        # Content Security Policy (strict self-contained workstation)
        if "Content-Security-Policy" not in response.headers:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "font-src 'self' data:; "
                "img-src 'self' data: https:; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self';"
            )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Sliding-window request rate limiter per client IP.
    Protects against DoS floods, scraping, and brute force attacks.
    """
    def __init__(self, app):
        super().__init__(app)
        self.request_records = defaultdict(list)
        # Limits: (max_requests, window_seconds)
        self.default_limit = (180, 60)      # 180 req / min general
        self.ingest_limit = (30, 60)        # 30 req / min for ingestion
        self.admin_limit = (6, 60)          # 6 req / min for admin actions

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # First IP in list is client
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "127.0.0.1"

    async def dispatch(self, request: Request, call_next):
        client_ip = self._get_client_ip(request)
        now = time.time()
        path = request.url.path

        if path.startswith("/api/admin"):
            max_req, window = self.admin_limit
            bucket_key = f"{client_ip}:admin"
        elif path.startswith("/api/ingest"):
            max_req, window = self.ingest_limit
            bucket_key = f"{client_ip}:ingest"
        else:
            max_req, window = self.default_limit
            bucket_key = f"{client_ip}:default"

        # Filter out expired timestamps
        history = [t for t in self.request_records[bucket_key] if now - t < window]
        if len(history) >= max_req:
            retry_after = int(window - (now - history[0])) if history else window
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too Many Requests",
                    "detail": "Request quota exceeded. Please slow down your requests.",
                    "retry_after_seconds": max(1, retry_after)
                },
                headers={"Retry-After": str(max(1, retry_after))}
            )

        history.append(now)
        self.request_records[bucket_key] = history

        # Periodic garbage collection for idle IPs
        if len(self.request_records) > 2000:
            for k in list(self.request_records.keys()):
                self.request_records[k] = [t for t in self.request_records[k] if now - t < 120]
                if not self.request_records[k]:
                    del self.request_records[k]

        return await call_next(request)


# ==========================================
# 2. LIFECYCLE & APPLICATION INITIALIZATION
# ==========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and seed initial historical cases if empty
    init_db()
    conn = get_connection()
    doc_count = conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
    if doc_count == 0:
        seed_database(conn)
    conn.close()
    yield

app = FastAPI(
    title="HistoryFather API",
    description="Production-Grade Temporal Intelligence Search Engine for Historical Reconstruction",
    version="1.0.0",
    lifespan=lifespan
)

# Attach Security and Rate-Limiting Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RateLimitMiddleware)

# CORS Configuration
# Restricts cross-origin requests to trusted origins while allowing developer workstations
allowed_origins_env = os.environ.get("ALLOWED_ORIGINS")
if allowed_origins_env:
    origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
    allow_all = "*" in origins
else:
    origins = ["http://localhost:8000", "http://127.0.0.1:8000", "http://localhost:3000", "http://localhost:5173"]
    allow_all = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else origins,
    allow_credentials=not allow_all,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Admin-Key", "X-Admin-Confirm"],
)

# Global Exception Handlers to Prevent Information Leakage
@app.exception_handler(sqlite3.Error)
async def sqlite_exception_handler(request: Request, exc: sqlite3.Error):
    logger.error("Database error processing %s: %s", request.url.path, str(exc))
    return JSONResponse(
        status_code=500,
        content={"error": "Database Error", "detail": "A database integrity or execution error occurred."}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})
    logger.error("Unhandled error processing %s: %s", request.url.path, str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error", "detail": "An internal server error occurred."}
    )


# Dependency helpers
def get_temporal_engine():
    return TemporalEngine()

def get_resolver():
    return EntityResolver()

def get_graph_engine():
    return TemporalGraphEngine()

def get_source_service():
    return SourceIntelligenceService()

def get_dossier_engine():
    return DossierEngine()

def get_ingestion_pipeline():
    return IngestionPipeline()


# ==========================================
# 3. API ENDPOINTS
# ==========================================

# --- Health & Status ---
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "HistoryFather Temporal Intelligence Engine"}

@app.get("/api/status")
def system_status():
    conn = get_connection()
    stats = {
        "documents_count": conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0],
        "passages_count": conn.execute("SELECT COUNT(*) FROM passages").fetchone()[0],
        "entities_count": conn.execute("SELECT COUNT(*) FROM entities").fetchone()[0],
        "aliases_count": conn.execute("SELECT COUNT(*) FROM entity_aliases").fetchone()[0],
        "events_count": conn.execute("SELECT COUNT(*) FROM events").fetchone()[0],
        "claims_count": conn.execute("SELECT COUNT(*) FROM claims").fetchone()[0],
        "relationships_count": conn.execute("SELECT COUNT(*) FROM relationships").fetchone()[0],
        "workspaces_count": conn.execute("SELECT COUNT(*) FROM workspaces").fetchone()[0],
    }
    conn.close()
    return {"status": "operational", "metrics": stats}

# --- Temporal Search & Timeline ---
@app.post("/api/search", response_model=SearchResponse)
def temporal_search(filter_query: TemporalSearchQuery, engine: TemporalEngine = Depends(get_temporal_engine)):
    return engine.search(filter_query)

@app.get("/api/timeline")
def get_timeline(
    entity_id: Optional[str] = Query(None, max_length=64),
    as_of_time: Optional[str] = Query(None, max_length=64),
    time_mode: str = Query("event_time", pattern=r"^(event_time|reporting_time)$", description="'event_time' or 'reporting_time'"),
    engine: TemporalEngine = Depends(get_temporal_engine)
):
    return engine.reconstruct_timeline(entity_id=entity_id, as_of_time=as_of_time, time_mode=time_mode)

# --- Entity Resolution ---
@app.get("/api/entities")
def list_entities(
    entity_type: Optional[str] = Query(None, max_length=64),
    q: Optional[str] = Query(None, max_length=128)
):
    conn = get_connection()
    clauses = ["1=1"]
    params = []
    if entity_type:
        clauses.append("e.entity_type = ?")
        params.append(entity_type)
    if q:
        # Sanitize query term for LIKE match
        clean_q = q.replace("%", "\\%").replace("_", "\\_").strip()
        clauses.append("(e.canonical_name LIKE ? ESCAPE '\\' OR e.summary LIKE ? ESCAPE '\\')")
        params.extend([f"%{clean_q}%", f"%{clean_q}%"])
    where_sql = " AND ".join(clauses)

    query = f"""
    SELECT e.*, 
           COUNT(DISTINCT a.id) as alias_count,
           COUNT(DISTINCT c.id) as claims_count
    FROM entities e
    LEFT JOIN entity_aliases a ON e.id = a.entity_id
    LEFT JOIN claims c ON e.id = c.subject_entity_id OR e.id = c.object_entity_id
    WHERE {where_sql}
    GROUP BY e.id
    ORDER BY e.canonical_name ASC
    LIMIT 200
    """
    cur = conn.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

@app.get("/api/entities/{entity_id}")
def get_entity_detail(
    entity_id: str = FPath(..., min_length=1, max_length=64),
    resolver: EntityResolver = Depends(get_resolver)
):
    res = resolver.get_entity_cluster(entity_id)
    if not res:
        raise HTTPException(status_code=404, detail="Entity not found")
    return res

@app.post("/api/entities/resolve", response_model=List[EntityMatchExplanation])
def resolve_entity_term(
    term: str = Query(..., min_length=1, max_length=128, description="Entity term, alias, or acronym to resolve"),
    resolver: EntityResolver = Depends(get_resolver)
):
    return resolver.resolve_term(term)

# --- Graph Engine & Traceable Evidence ---
@app.get("/api/graph", response_model=GraphResponse)
def get_relationship_graph(
    as_of_time: Optional[str] = Query(None, max_length=64),
    entity_id: Optional[str] = Query(None, max_length=64),
    hops: int = Query(2, ge=1, le=4),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    engine: TemporalGraphEngine = Depends(get_graph_engine)
):
    return engine.get_graph(
        as_of_time=as_of_time,
        entity_id=entity_id,
        hops=hops,
        min_confidence=min_confidence
    )

@app.get("/api/graph/path")
def find_connection_path(
    source_id: str = Query(..., min_length=1, max_length=64),
    target_id: str = Query(..., min_length=1, max_length=64),
    engine: TemporalGraphEngine = Depends(get_graph_engine)
):
    return engine.find_path(source_id, target_id)

@app.get("/api/relationships/{rel_id}/evidence", response_model=List[RelationshipEvidenceModel])
def get_edge_evidence(
    rel_id: str = FPath(..., min_length=1, max_length=64),
    engine: TemporalGraphEngine = Depends(get_graph_engine)
):
    return engine.get_edge_evidence(rel_id)

# --- Temporal Diff ("Snapshot A vs Snapshot B") ---
@app.post("/api/diff", response_model=TemporalDiffResponse)
def compare_temporal_snapshots(
    req: TemporalDiffRequest,
    engine: TemporalEngine = Depends(get_temporal_engine)
):
    return engine.compare_snapshots(
        snapshot_a=req.snapshot_a_time,
        snapshot_b=req.snapshot_b_time,
        entity_id=req.entity_id
    )

# --- Source Intelligence & Syndication ---
@app.get("/api/sources", response_model=SourceIntelligenceResponse)
def get_source_intelligence(service: SourceIntelligenceService = Depends(get_source_service)):
    return service.get_source_intelligence()

# --- Investigation Workspaces & Dossiers ---
@app.get("/api/workspaces")
def list_workspaces(engine: DossierEngine = Depends(get_dossier_engine)):
    return engine.list_workspaces()

@app.post("/api/workspaces", response_model=WorkspaceDetail)
def create_workspace(req: WorkspaceCreate, engine: DossierEngine = Depends(get_dossier_engine)):
    return engine.create_workspace(req)

@app.get("/api/workspaces/{ws_id}", response_model=WorkspaceDetail)
def get_workspace(
    ws_id: str = FPath(..., min_length=1, max_length=64),
    engine: DossierEngine = Depends(get_dossier_engine)
):
    ws = engine.get_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws

@app.post("/api/workspaces/{ws_id}/items")
def add_workspace_item(
    ws_id: str = FPath(..., min_length=1, max_length=64),
    item: WorkspaceItemAdd = ...,
    engine: DossierEngine = Depends(get_dossier_engine)
):
    res = engine.add_item(ws_id, item)
    if res is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return res

@app.delete("/api/workspaces/{ws_id}/items/{item_id}")
def delete_workspace_item(
    ws_id: str = FPath(..., min_length=1, max_length=64),
    item_id: str = FPath(..., min_length=1, max_length=64),
    engine: DossierEngine = Depends(get_dossier_engine)
):
    res = engine.remove_item(ws_id, item_id)
    if res is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return res

@app.post("/api/workspaces/{ws_id}/notes")
def add_workspace_note(
    ws_id: str = FPath(..., min_length=1, max_length=64),
    note: WorkspaceNoteCreate = ...,
    engine: DossierEngine = Depends(get_dossier_engine)
):
    res = engine.add_note(ws_id, note)
    if res is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return res

@app.get("/api/workspaces/{ws_id}/export/markdown")
def export_dossier_markdown(
    ws_id: str = FPath(..., min_length=1, max_length=64),
    engine: DossierEngine = Depends(get_dossier_engine)
):
    ws = engine.get_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    content = engine.export_dossier_markdown(ws_id)
    safe_ws_id = re.sub(r"[^a-zA-Z0-9_\-]", "", ws_id)
    return PlainTextResponse(
        content=content,
        headers={"Content-Disposition": f'attachment; filename="dossier_{safe_ws_id}.md"'}
    )

@app.get("/api/workspaces/{ws_id}/export/html")
def export_dossier_html(
    ws_id: str = FPath(..., min_length=1, max_length=64),
    engine: DossierEngine = Depends(get_dossier_engine)
):
    ws = engine.get_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    content = engine.export_dossier_html(ws_id)
    return HTMLResponse(content=content)

@app.get("/api/workspaces/{ws_id}/export/json")
def export_dossier_json(
    ws_id: str = FPath(..., min_length=1, max_length=64),
    engine: DossierEngine = Depends(get_dossier_engine)
):
    ws = engine.get_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws.model_dump()

@app.get("/api/workspaces/{ws_id}/export/stix")
def export_dossier_stix(
    ws_id: str = FPath(..., min_length=1, max_length=64),
    engine: DossierEngine = Depends(get_dossier_engine)
):
    try:
        bundle = engine.export_dossier_stix(ws_id)
        safe_ws = re.sub(r'[^a-zA-Z0-9_\-]', '', ws_id)
        return JSONResponse(
            content=bundle,
            headers={"Content-Disposition": f'attachment; filename="stix21_dossier_{safe_ws}.json"'}
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Workspace not found")

# --- Ingestion Pipeline ---
@app.post("/api/ingest", response_model=IngestDocumentResponse)
def ingest_document(req: IngestDocumentRequest, pipeline: IngestionPipeline = Depends(get_ingestion_pipeline)):
    return pipeline.ingest_document(req)

# --- Admin Reseed (Protected Endpoint) ---
@app.post("/api/admin/reseed")
def admin_reseed(request: Request):
    """
    Administrative database reset. Protected by confirmation header and optional ADMIN_KEY.
    """
    # 1. Require explicit confirmation header to prevent CSRF / accidental calls
    confirm_header = request.headers.get("X-Admin-Confirm")
    if confirm_header != "reseed":
        raise HTTPException(
            status_code=400,
            detail="Missing required header 'X-Admin-Confirm: reseed' to authorize database reseed."
        )

    # 2. Check for optional ADMIN_KEY environment variable
    admin_key_env = os.environ.get("HISTORYFATHER_ADMIN_KEY") or os.environ.get("ADMIN_KEY")
    if admin_key_env:
        client_key = request.headers.get("X-Admin-Key")
        auth_header = request.headers.get("Authorization", "")
        bearer_key = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else ""
        if client_key != admin_key_env and bearer_key != admin_key_env:
            raise HTTPException(
                status_code=403,
                detail="Forbidden: Invalid or missing administrator credentials."
            )

    init_db()
    res = seed_database()
    return {"status": "reseeded", "details": res}


# ==========================================
# 4. STATIC FRONTEND SERVING (PATH-TRAVERSAL PROOF)
# ==========================================

DIST_PATH = (Path(__file__).resolve().parent.parent.parent / "frontend" / "dist").resolve()

SAFE_STATIC_EXTENSIONS = {
    ".html", ".htm", ".js", ".mjs", ".css", ".svg", ".png",
    ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".woff", ".woff2",
    ".ttf", ".json", ".map", ".txt"
}

def safe_resolve_static(base_dir: Path, requested_path: str) -> Optional[Path]:
    """
    Strictly resolve requested path within base_dir.
    Rejects directory traversal (..), null bytes, backslashes, and unauthorized extensions.
    """
    if not base_dir.exists():
        return None
    if "\0" in requested_path or "\\" in requested_path or ".." in requested_path:
        return None
    clean_path = requested_path.lstrip("/").strip()
    if not clean_path:
        return None
    try:
        target = (base_dir / clean_path).resolve()
        base_resolved = base_dir.resolve()
        # Verify target is strictly within the allowed base directory
        if base_resolved not in target.parents and target != base_resolved:
            return None
        if target.is_file() and target.suffix.lower() in SAFE_STATIC_EXTENSIONS:
            return target
    except Exception:
        return None
    return None

if DIST_PATH.exists():
    assets_dir = DIST_PATH / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        # Clean path
        clean_path = full_path.strip().lstrip("/")
        
        # Root path -> index.html
        if not clean_path:
            index_target = DIST_PATH / "index.html"
            if index_target.is_file():
                return FileResponse(index_target)
            raise HTTPException(status_code=404, detail="Frontend index.html not found")

        # Try to safely resolve the static file
        safe_target = safe_resolve_static(DIST_PATH, clean_path)
        if safe_target:
            return FileResponse(safe_target)

        # If a specific file extension was requested (e.g. .js, .png, .css) and not found, return 404
        # to prevent MIME-confusion and XSS
        if "." in Path(clean_path).name:
            raise HTTPException(status_code=404, detail="File not found")

        # SPA fallback route: return index.html for client-side routing
        index_target = DIST_PATH / "index.html"
        if index_target.is_file():
            return FileResponse(index_target)
        raise HTTPException(status_code=404, detail="Page not found")
