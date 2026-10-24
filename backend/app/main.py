"""
HistoryFather - Main FastAPI Application.
Exposes REST endpoints for temporal search, historical reconstruction,
entity resolution, graph projection, temporal diff comparison,
source intelligence, and investigation workspace dossiers.
"""

import os
from pathlib import Path
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Query, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, PlainTextResponse, FileResponse

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

# Enable CORS for local dev and embedded workstations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    entity_id: Optional[str] = Query(None),
    as_of_time: Optional[str] = Query(None),
    time_mode: str = Query("event_time", description="'event_time' or 'reporting_time'"),
    engine: TemporalEngine = Depends(get_temporal_engine)
):
    return engine.reconstruct_timeline(entity_id=entity_id, as_of_time=as_of_time, time_mode=time_mode)

# --- Entity Resolution ---
@app.get("/api/entities")
def list_entities(
    entity_type: Optional[str] = Query(None),
    q: Optional[str] = Query(None)
):
    conn = get_connection()
    clauses = ["1=1"]
    params = []
    if entity_type:
        clauses.append("e.entity_type = ?")
        params.append(entity_type)
    if q:
        clauses.append("(e.canonical_name LIKE ? OR e.summary LIKE ?)")
        params.extend([f"%{q}%", f"%{q}%"])
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
    """
    cur = conn.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

@app.get("/api/entities/{entity_id}")
def get_entity_detail(entity_id: str, resolver: EntityResolver = Depends(get_resolver)):
    res = resolver.get_entity_cluster(entity_id)
    if not res:
        raise HTTPException(status_code=404, detail="Entity not found")
    return res

@app.post("/api/entities/resolve", response_model=List[EntityMatchExplanation])
def resolve_entity_term(
    term: str = Query(..., description="Entity term, alias, or acronym to resolve"),
    resolver: EntityResolver = Depends(get_resolver)
):
    return resolver.resolve_term(term)

# --- Graph Engine & Traceable Evidence ---
@app.get("/api/graph", response_model=GraphResponse)
def get_relationship_graph(
    as_of_time: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
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
    source_id: str = Query(...),
    target_id: str = Query(...),
    engine: TemporalGraphEngine = Depends(get_graph_engine)
):
    return engine.find_path(source_id, target_id)

@app.get("/api/relationships/{rel_id}/evidence", response_model=List[RelationshipEvidenceModel])
def get_edge_evidence(rel_id: str, engine: TemporalGraphEngine = Depends(get_graph_engine)):
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
def get_workspace(ws_id: str, engine: DossierEngine = Depends(get_dossier_engine)):
    ws = engine.get_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws

@app.post("/api/workspaces/{ws_id}/items")
def add_workspace_item(ws_id: str, item: WorkspaceItemAdd, engine: DossierEngine = Depends(get_dossier_engine)):
    return engine.add_item(ws_id, item)

@app.delete("/api/workspaces/{ws_id}/items/{item_id}")
def delete_workspace_item(ws_id: str, item_id: str, engine: DossierEngine = Depends(get_dossier_engine)):
    return engine.remove_item(ws_id, item_id)

@app.post("/api/workspaces/{ws_id}/notes")
def add_workspace_note(ws_id: str, note: WorkspaceNoteCreate, engine: DossierEngine = Depends(get_dossier_engine)):
    return engine.add_note(ws_id, note)

@app.get("/api/workspaces/{ws_id}/export/markdown")
def export_dossier_markdown(ws_id: str, engine: DossierEngine = Depends(get_dossier_engine)):
    content = engine.export_dossier_markdown(ws_id)
    return PlainTextResponse(
        content=content,
        headers={"Content-Disposition": f'attachment; filename="dossier_{ws_id}.md"'}
    )

@app.get("/api/workspaces/{ws_id}/export/html")
def export_dossier_html(ws_id: str, engine: DossierEngine = Depends(get_dossier_engine)):
    content = engine.export_dossier_html(ws_id)
    return HTMLResponse(content=content)

@app.get("/api/workspaces/{ws_id}/export/json")
def export_dossier_json(ws_id: str, engine: DossierEngine = Depends(get_dossier_engine)):
    ws = engine.get_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws.model_dump()

# --- Ingestion Pipeline ---
@app.post("/api/ingest", response_model=IngestDocumentResponse)
def ingest_document(req: IngestDocumentRequest, pipeline: IngestionPipeline = Depends(get_ingestion_pipeline)):
    return pipeline.ingest_document(req)

# --- Admin Reseed ---
@app.post("/api/admin/reseed")
def admin_reseed():
    init_db()
    res = seed_database()
    return {"status": "reseeded", "details": res}

# --- Static Frontend Serving (in production) ---
DIST_PATH = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if DIST_PATH.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_PATH / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        target = DIST_PATH / full_path
        if target.is_file():
            return FileResponse(target)
        return FileResponse(DIST_PATH / "index.html")
