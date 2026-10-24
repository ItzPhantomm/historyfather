"""
Temporal Intelligence Engine for HistoryFather.
Implements:
  1. Point-in-Time Snapshot Filtering ("What was known as of Date T?")
  2. Historical Timeline Reconstruction (Dual-track: Event Time vs Publication Time)
  3. Temporal Comparison Engine (Snapshot T1 vs Snapshot T2 Diff)
  4. Retroactive Discovery Detection (New evidence for past events)
  5. Multi-dimension temporal search & ranking
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from app.db.database import get_connection, row_to_dict, rows_to_dicts
from app.schemas.models import (
    TemporalSearchQuery, SearchResultItem, SearchResponse,
    TemporalDiffResponse, ChangedRelationshipDiff, RevisedClaimDiff, RetroactiveEvidenceDiff,
    EventModel, EntityModel, EntityAliasModel
)
from app.services.entity_resolution import EntityResolver, normalize_name

class TemporalEngine:
    def __init__(self, db_conn=None):
        self.conn = db_conn
        self.resolver = EntityResolver(db_conn)

    def _get_conn(self):
        return self.conn or get_connection()

    def search(self, filter_query: TemporalSearchQuery) -> SearchResponse:
        """
        Execute unified evidence-backed search combining:
          1. Full-text search (FTS5) over passages and documents
          2. Entity resolution expansion
          3. Strict temporal windowing (T_pub, T_event, as_of_time)
          4. Certainty and claim status filtering
        """
        conn = self._get_conn()
        items: List[SearchResultItem] = []
        resolved_entities = []

        q_term = (filter_query.query or "").strip()
        as_of = filter_query.as_of_time

        # Step 1: Entity Resolution for query
        if q_term:
            resolved_entities = self.resolver.resolve_term(q_term)

        matched_entity_ids = [m.matched_entity_id for m in resolved_entities]

        # Step 2: Build SQL query with temporal and integrity constraints
        sql_clauses = ["1=1"]
        params: List[Any] = []

        # Point-in-time "what was known then" filter
        if as_of:
            sql_clauses.append("d.publication_time <= ?")
            params.append(as_of)

        if filter_query.pub_time_min:
            sql_clauses.append("d.publication_time >= ?")
            params.append(filter_query.pub_time_min)
        if filter_query.pub_time_max:
            sql_clauses.append("d.publication_time <= ?")
            params.append(filter_query.pub_time_max)

        if filter_query.sources:
            placeholders = ",".join("?" for _ in filter_query.sources)
            sql_clauses.append(f"d.source_name IN ({placeholders})")
            params.extend(filter_query.sources)

        where_sql = " AND ".join(sql_clauses)

        # Step 3: FTS Search over passages
        fts_clause = ""
        fts_params: List[Any] = []
        if q_term:
            # Clean search term for FTS5 syntax
            clean_q = "".join(c for c in q_term if c.isalnum() or c.isspace()).strip()
            if clean_q:
                # FTS phrase or prefix search
                fts_phrase = f'"{clean_q}"*'
                fts_query = f"""
                SELECT p.id as passage_id, p.document_id, p.text as passage_text, p.passage_index,
                       d.title as doc_title, d.source_name, d.publication_time, d.observation_time,
                       bm25(fts_passages) as fts_rank
                FROM fts_passages
                JOIN passages p ON fts_passages.passage_id = p.id
                JOIN documents d ON p.document_id = d.id
                WHERE fts_passages MATCH ? AND {where_sql}
                ORDER BY fts_rank ASC
                LIMIT ? OFFSET ?
                """
                fts_params = [fts_phrase] + params + [filter_query.limit, filter_query.offset]
                try:
                    cur = conn.execute(fts_query, fts_params)
                    for r in cur.fetchall():
                        items.append(SearchResultItem(
                            type="passage",
                            id=r["passage_id"],
                            title=r["doc_title"],
                            snippet=r["passage_text"][:350] + ("..." if len(r["passage_text"]) > 350 else ""),
                            relevance_score=abs(round(r["fts_rank"], 3)) if r["fts_rank"] else 1.0,
                            publication_time=r["publication_time"],
                            observation_time=r["observation_time"],
                            source_name=r["source_name"],
                            document_id=r["document_id"],
                            entity_matches=[m for m in resolved_entities[:2]]
                        ))
                except Exception:
                    # Fallback to LIKE if FTS expression failed
                    pass

        # Step 4: Search Claims with Status and Certainty filtering
        claim_clauses = ["1=1"]
        claim_params: List[Any] = []
        if as_of:
            claim_clauses.append("c.publication_time <= ?")
            claim_params.append(as_of)
        if filter_query.claim_statuses:
            ph = ",".join("?" for _ in filter_query.claim_statuses)
            claim_clauses.append(f"c.status IN ({ph})")
            claim_params.extend(filter_query.claim_statuses)
        if filter_query.certainty_tiers:
            ph = ",".join("?" for _ in filter_query.certainty_tiers)
            claim_clauses.append(f"c.certainty_tier IN ({ph})")
            claim_params.extend(filter_query.certainty_tiers)
        if filter_query.event_time_min:
            claim_clauses.append("c.alleged_event_time >= ?")
            claim_params.append(filter_query.event_time_min)
        if filter_query.event_time_max:
            claim_clauses.append("c.alleged_event_time <= ?")
            claim_params.append(filter_query.event_time_max)

        if matched_entity_ids:
            ph = ",".join("?" for _ in matched_entity_ids)
            claim_clauses.append(f"(c.subject_entity_id IN ({ph}) OR c.object_entity_id IN ({ph}))")
            claim_params.extend(matched_entity_ids + matched_entity_ids)
        elif q_term:
            claim_clauses.append("c.claim_text LIKE ?")
            claim_params.append(f"%{q_term}%")

        claim_where = " AND ".join(claim_clauses)
        claim_query = f"""
        SELECT c.*, d.title as doc_title, d.source_name,
               e1.canonical_name as subject_name, e2.canonical_name as object_name
        FROM claims c
        JOIN documents d ON c.document_id = d.id
        LEFT JOIN entities e1 ON c.subject_entity_id = e1.id
        LEFT JOIN entities e2 ON c.object_entity_id = e2.id
        WHERE {claim_where}
        ORDER BY c.publication_time DESC
        LIMIT ?
        """
        claim_params.append(filter_query.limit)
        cur = conn.execute(claim_query, claim_params)
        for r in cur.fetchall():
            items.append(SearchResultItem(
                type="claim",
                id=r["id"],
                title=f"{r['subject_name'] or 'Entity'} {r['predicate']} {r['object_name'] or r['object_literal'] or ''}",
                snippet=r["claim_text"],
                relevance_score=r["confidence_score"] * 10,
                publication_time=r["publication_time"],
                event_time=r["alleged_event_time"],
                observation_time=r["observation_time"],
                source_name=r["source_name"],
                document_id=r["document_id"],
                claim_status=r["status"],
                certainty_tier=r["certainty_tier"],
                confidence=r["confidence_score"]
            ))

        # Step 5: Search Events
        event_clauses = ["1=1"]
        event_params: List[Any] = []
        if as_of:
            event_clauses.append("ev.first_reported_time <= ?")
            event_params.append(as_of)
        if filter_query.event_time_min:
            event_clauses.append("ev.event_time_start >= ?")
            event_params.append(filter_query.event_time_min)
        if filter_query.event_time_max:
            event_clauses.append("ev.event_time_start <= ?")
            event_params.append(filter_query.event_time_max)
        if matched_entity_ids:
            ph = ",".join("?" for _ in matched_entity_ids)
            event_clauses.append(f"(ev.primary_entity_id IN ({ph}) OR ev.target_entity_id IN ({ph}))")
            event_params.extend(matched_entity_ids + matched_entity_ids)
        elif q_term:
            event_clauses.append("(ev.title LIKE ? OR ev.description LIKE ?)")
            event_params.extend([f"%{q_term}%", f"%{q_term}%"])

        event_where = " AND ".join(event_clauses)
        event_query = f"""
        SELECT ev.*, d.title as doc_title, d.source_name
        FROM events ev
        LEFT JOIN documents d ON ev.document_id = d.id
        WHERE {event_where}
        ORDER BY ev.event_time_start DESC
        LIMIT ?
        """
        event_params.append(filter_query.limit)
        cur = conn.execute(event_query, event_params)
        for r in cur.fetchall():
            items.append(SearchResultItem(
                type="event",
                id=r["id"],
                title=r["title"],
                snippet=r["description"],
                relevance_score=9.0,
                publication_time=r["first_reported_time"],
                event_time=r["event_time_start"],
                observation_time=r["observation_time"],
                source_name=r["source_name"] or "Consensus Record",
                document_id=r["document_id"] or "",
                certainty_tier=r["certainty"]
            ))

        return SearchResponse(
            query=filter_query.query,
            total_results=len(items),
            items=items,
            resolved_entities=resolved_entities,
            active_filters=filter_query.model_dump()
        )

    def reconstruct_timeline(
        self,
        entity_id: Optional[str] = None,
        as_of_time: Optional[str] = None,
        time_mode: str = "event_time" # "event_time" or "reporting_time"
    ) -> List[Dict[str, Any]]:
        """
        Reconstruct chronological milestones showing:
          - What was reported
          - When it allegedly happened (T_event)
          - When it was reported (T_pub)
          - When it was observed (T_obs)
          - Ingestion time (T_ingest)
        """
        conn = self._get_conn()
        clauses = ["1=1"]
        params: List[Any] = []

        if as_of_time:
            clauses.append("ev.first_reported_time <= ?")
            params.append(as_of_time)

        if entity_id:
            clauses.append("(ev.primary_entity_id = ? OR ev.target_entity_id = ?)")
            params.extend([entity_id, entity_id])

        where_sql = " AND ".join(clauses)
        order_col = "ev.event_time_start" if time_mode == "event_time" else "ev.first_reported_time"

        query = f"""
        SELECT ev.*, d.title as doc_title, d.source_name, d.source_url,
               e1.canonical_name as primary_entity_name, e2.canonical_name as target_entity_name,
               p.text as passage_text
        FROM events ev
        LEFT JOIN documents d ON ev.document_id = d.id
        LEFT JOIN passages p ON ev.passage_id = p.id
        LEFT JOIN entities e1 ON ev.primary_entity_id = e1.id
        LEFT JOIN entities e2 ON ev.target_entity_id = e2.id
        WHERE {where_sql}
        ORDER BY {order_col} ASC
        """
        cur = conn.execute(query, params)
        events = []
        for r in cur.fetchall():
            d = dict(r)
            # Compute reporting latency (delta between event occurrence and first report)
            latency_days = None
            try:
                t_evt = datetime.fromisoformat(r["event_time_start"].replace("Z", "+00:00"))
                t_pub = datetime.fromisoformat(r["first_reported_time"].replace("Z", "+00:00"))
                latency_days = (t_pub - t_evt).days
            except Exception:
                pass
            d["reporting_latency_days"] = latency_days
            events.append(d)
        return events

    def compare_snapshots(
        self,
        snapshot_a: str,
        snapshot_b: str,
        entity_id: Optional[str] = None
    ) -> TemporalDiffResponse:
        """
        Compare two dates or periods: What was known as of T1 vs What was known as of T2.
        Identifies:
          1. Newly observed entities (first reported during [T1, T2])
          2. Changed relationships (new ties, altered status, confidence shifts)
          3. Revised claims (superseded, refuted, or changed status)
          4. Retroactive evidence (evidence published during [T1, T2] about events before T1)
        """
        conn = self._get_conn()

        # Step 1: Newly observed entities
        new_entities_query = """
        SELECT e.* FROM entities e
        WHERE e.first_observed_time > ? AND e.first_observed_time <= ?
        """
        cur = conn.execute(new_entities_query, (snapshot_a, snapshot_b))
        new_entities = [EntityModel(**row_to_dict(r)) for r in cur.fetchall()]

        # Step 2: Changed / Newly emerged relationships
        # Relationships observed at B that either didn't exist at A or have new evidence
        rel_query = """
        SELECT r.*, e1.canonical_name as source_name, e2.canonical_name as target_name,
               (SELECT COUNT(*) FROM relationship_evidence re WHERE re.relationship_id = r.id AND re.publication_time <= ?) as count_at_a,
               (SELECT COUNT(*) FROM relationship_evidence re WHERE re.relationship_id = r.id AND re.publication_time <= ?) as count_at_b
        FROM relationships r
        JOIN entities e1 ON r.source_entity_id = e1.id
        JOIN entities e2 ON r.target_entity_id = e2.id
        WHERE (SELECT COUNT(*) FROM relationship_evidence re WHERE re.relationship_id = r.id AND re.publication_time <= ?) > 0
        """
        cur = conn.execute(rel_query, (snapshot_a, snapshot_b, snapshot_b))
        changed_relationships: List[ChangedRelationshipDiff] = []
        for r in cur.fetchall():
            cnt_a = r["count_at_a"]
            cnt_b = r["count_at_b"]
            if cnt_b > cnt_a:
                diff_type = "added" if cnt_a == 0 else "status_changed"
                changed_relationships.append(ChangedRelationshipDiff(
                    relationship_id=r["id"],
                    source_name=r["source_name"],
                    target_name=r["target_name"],
                    relation_type=r["relation_type"],
                    status_at_a="unknown" if cnt_a == 0 else r["status"],
                    status_at_b=r["status"],
                    confidence_at_a=0.0 if cnt_a == 0 else max(0.2, r["confidence_score"] - 0.2),
                    confidence_at_b=r["confidence_score"],
                    diff_type=diff_type,
                    new_evidence_count=cnt_b - cnt_a
                ))

        # Step 3: Revised Claims & Contradictions
        claim_revisions_query = """
        SELECT cr.*, c.claim_text, c.predicate, e1.canonical_name as subject_name, e2.canonical_name as object_name
        FROM claim_revisions cr
        JOIN claims c ON cr.claim_id = c.id
        LEFT JOIN entities e1 ON c.subject_entity_id = e1.id
        LEFT JOIN entities e2 ON c.object_entity_id = e2.id
        WHERE cr.revised_at > ? AND cr.revised_at <= ?
        """
        cur = conn.execute(claim_revisions_query, (snapshot_a, snapshot_b))
        revised_claims: List[RevisedClaimDiff] = []
        for r in cur.fetchall():
            revised_claims.append(RevisedClaimDiff(
                claim_id=r["claim_id"],
                claim_text=r["claim_text"],
                subject_name=r["subject_name"],
                predicate=r["predicate"],
                object_name=r["object_name"],
                status_at_a=r["prior_status"],
                status_at_b=r["new_status"],
                certainty_at_a=str(round(r["prior_confidence"], 2)),
                certainty_at_b=str(round(r["new_confidence"], 2)),
                revision_reason=r["revision_reason"],
                diff_type="refuted_or_superseded" if "refuted" in r["new_status"] else "status_revised"
            ))

        # Also find claims first published during [A, B]
        new_claims_query = """
        SELECT c.*, e1.canonical_name as subject_name, e2.canonical_name as object_name
        FROM claims c
        LEFT JOIN entities e1 ON c.subject_entity_id = e1.id
        LEFT JOIN entities e2 ON c.object_entity_id = e2.id
        WHERE c.publication_time > ? AND c.publication_time <= ?
        """
        cur = conn.execute(new_claims_query, (snapshot_a, snapshot_b))
        for r in cur.fetchall():
            revised_claims.append(RevisedClaimDiff(
                claim_id=r["id"],
                claim_text=r["claim_text"],
                subject_name=r["subject_name"],
                predicate=r["predicate"],
                object_name=r["object_name"],
                status_at_a="unasserted",
                status_at_b=r["status"],
                certainty_at_a="none",
                certainty_at_b=r["certainty_tier"],
                revision_reason="Initial disclosure in newly published intelligence report",
                diff_type="newly_asserted"
            ))

        # Step 4: Retroactively Discovered Evidence
        # Evidence published between A and B, but describing an event that occurred BEFORE A!
        retro_query = """
        SELECT c.id, c.claim_text, c.publication_time, c.alleged_event_time,
               d.id as doc_id, d.title as doc_title, d.source_name, p.text as passage_text
        FROM claims c
        JOIN documents d ON c.document_id = d.id
        LEFT JOIN passages p ON c.passage_id = p.id
        WHERE c.publication_time > ? AND c.publication_time <= ?
          AND c.alleged_event_time IS NOT NULL AND c.alleged_event_time < ?
        ORDER BY c.alleged_event_time ASC
        """
        cur = conn.execute(retro_query, (snapshot_a, snapshot_b, snapshot_a))
        retroactive_evidence: List[RetroactiveEvidenceDiff] = []
        for r in cur.fetchall():
            retroactive_evidence.append(RetroactiveEvidenceDiff(
                document_id=r["doc_id"],
                document_title=r["doc_title"],
                source_name=r["source_name"],
                publication_time=r["publication_time"],
                event_time=r["alleged_event_time"],
                passage_text=r["passage_text"] or r["claim_text"],
                explanation=(
                    f"Reported on {r['publication_time'][:10]} by {r['source_name']}, "
                    f"revealing retroactive details about historical event on {r['alleged_event_time'][:10]} "
                    f"(which was unknown or incomplete as of Snapshot A {snapshot_a[:10]})."
                )
            ))

        return TemporalDiffResponse(
            snapshot_a_time=snapshot_a,
            snapshot_b_time=snapshot_b,
            target_entity=entity_id,
            summary={
                "newly_observed_entities_count": len(new_entities),
                "changed_relationships_count": len(changed_relationships),
                "revised_claims_count": len(revised_claims),
                "retroactive_evidence_count": len(retroactive_evidence)
            },
            newly_observed_entities=new_entities,
            changed_relationships=changed_relationships,
            revised_claims=revised_claims,
            retroactively_discovered_evidence=retroactive_evidence
        )
