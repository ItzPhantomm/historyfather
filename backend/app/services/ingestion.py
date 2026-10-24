"""
Document Ingestion & Pipeline Service for HistoryFather.
Parses, normalizes, chunks into passages, checks for near-duplicates/syndication,
indexes into SQLite FTS5, and links entity mentions.
"""

import uuid
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from app.db.database import get_connection
from app.services.dedup_engine import compute_sha256, compute_simhash, hamming_distance
from app.services.entity_resolution import EntityResolver
from app.schemas.models import IngestDocumentRequest, IngestDocumentResponse

def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def chunk_passages(text: str, max_chars: int = 1200, max_chunks: int = 50) -> List[str]:
    """Break text into semantically cohesive paragraphs or chunks with hard length boundaries."""
    raw_paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    # Break any abnormally oversized single paragraph
    paragraphs = []
    for p in raw_paragraphs:
        while len(p) > max_chars:
            split_idx = p.rfind(" ", 0, max_chars)
            if split_idx <= 0:
                split_idx = max_chars
            paragraphs.append(p[:split_idx].strip())
            p = p[split_idx:].strip()
        if p:
            paragraphs.append(p)

    chunks = []
    current_chunk = []
    current_len = 0

    for p in paragraphs:
        if current_len + len(p) > max_chars and current_chunk:
            chunks.append("\n\n".join(current_chunk))
            current_chunk = [p]
            current_len = len(p)
            if len(chunks) >= max_chunks:
                break
        else:
            current_chunk.append(p)
            current_len += len(p)

    if current_chunk and len(chunks) < max_chunks:
        chunks.append("\n\n".join(current_chunk))

    return chunks if chunks else [text.strip()[:max_chars]]

class IngestionPipeline:
    def __init__(self, db_conn=None):
        self.conn = db_conn
        self.resolver = EntityResolver(db_conn)

    def _get_conn(self):
        return self.conn or get_connection()

    def ingest_document(self, req: IngestDocumentRequest) -> IngestDocumentResponse:
        conn = self._get_conn()
        content = req.content.strip()
        content_hash = compute_sha256(content)
        simhash_val = compute_simhash(content)
        now = utcnow_iso()

        # Step 1: Check for exact duplicate
        existing = conn.execute("SELECT id FROM documents WHERE content_hash = ?", (content_hash,)).fetchone()
        if existing:
            return IngestDocumentResponse(
                document_id=existing["id"],
                title=req.title,
                passages_count=0,
                extracted_entities=[],
                extracted_claims_count=0,
                is_near_duplicate=True,
                near_duplicate_of=existing["id"],
                simhash_distance=0
            )

        # Step 2: Check for near duplicate (SimHash Hamming distance <= 6)
        cur_sim = conn.execute("SELECT id, title, simhash, publication_time FROM documents ORDER BY publication_time ASC")
        is_near_dup = False
        near_dup_of = None
        min_distance = 64

        for row in cur_sim.fetchall():
            dist = hamming_distance(simhash_val, row["simhash"])
            if dist < min_distance:
                min_distance = dist
            if dist <= 6:
                is_near_dup = True
                near_dup_of = row["id"]
                break

        doc_id = f"doc_{uuid.uuid4().hex[:10]}"
        word_count = len(content.split())

        # Validate URL scheme to prevent javascript: or file: attacks
        safe_source_url = req.source_url
        if safe_source_url:
            safe_source_url = safe_source_url.strip()
            if not (safe_source_url.startswith("http://") or safe_source_url.startswith("https://")):
                safe_source_url = None

        conn.execute(
            """
            INSERT INTO documents (
                id, title, source_name, source_url, source_type,
                publication_time, observation_time, ingestion_time,
                raw_content, content_hash, simhash, is_syndicated,
                canonical_source_id, reliability_tier, word_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                doc_id, req.title, req.source_name, safe_source_url, req.source_type,
                req.publication_time, req.observation_time, now,
                content, content_hash, simhash_val, 1 if is_near_dup else 0,
                near_dup_of if is_near_dup else None, req.reliability_tier, word_count
            )
        )

        # Step 3: Chunk into passages and insert into passages & FTS5
        chunks = chunk_passages(content)
        extracted_entities = set()
        resolved_word_cache = {}

        for idx, chunk_text in enumerate(chunks):
            passage_id = f"pas_{uuid.uuid4().hex[:10]}"
            p_hash = compute_sha256(chunk_text)

            # Detect entity mentions bounded to top 25 words per chunk
            words = list(set(re.findall(r"\b[A-Z][a-zA-Z0-9_\-]{2,30}\b", chunk_text)))[:25]
            detected_eids = []
            for w in words:
                if w not in resolved_word_cache:
                    resolved_word_cache[w] = self.resolver.resolve_term(w, min_confidence=0.85)
                matches = resolved_word_cache[w]
                for m in matches:
                    detected_eids.append(m.matched_entity_id)
                    extracted_entities.add(m.canonical_name)

            conn.execute(
                """
                INSERT INTO passages (
                    id, document_id, passage_index, text, passage_hash, entity_mentions, claims_count, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (passage_id, doc_id, idx, chunk_text, p_hash, str(list(set(detected_eids))), 0, now)
            )

            # Insert into FTS5 virtual table
            conn.execute(
                """
                INSERT INTO fts_passages (
                    passage_id, document_id, document_title, source_name, passage_text
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (passage_id, doc_id, req.title, req.source_name, chunk_text)
            )

        conn.commit()

        return IngestDocumentResponse(
            document_id=doc_id,
            title=req.title,
            passages_count=len(chunks),
            extracted_entities=list(extracted_entities),
            extracted_claims_count=0,
            is_near_duplicate=is_near_dup,
            near_duplicate_of=near_dup_of,
            simhash_distance=min_distance if is_near_dup else None
        )
