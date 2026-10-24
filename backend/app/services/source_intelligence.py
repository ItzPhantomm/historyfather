"""
Source Intelligence & Syndication Analysis Service.
Tracks:
  1. Source reliability metrics & verified claims ratios
  2. First-to-report latency & historical scoops
  3. Wire syndication & near-duplicate article clusters
  4. Circular reporting / echo chamber warnings
"""

from typing import List, Dict, Any, Optional
from app.db.database import get_connection, rows_to_dicts
from app.services.dedup_engine import detect_syndication_and_circularity
from app.schemas.models import (
    SourceIntelligenceResponse, SourceReliabilityMetric, SyndicationCluster
)

class SourceIntelligenceService:
    def __init__(self, db_conn=None):
        self.conn = db_conn

    def _get_conn(self):
        return self.conn or get_connection()

    def get_source_intelligence(self) -> SourceIntelligenceResponse:
        conn = self._get_conn()

        # Step 1: Fetch all documents for deduplication and circularity analysis
        cur_docs = conn.execute(
            """
            SELECT id, title, source_name, publication_time, raw_content, simhash, is_syndicated, reliability_tier
            FROM documents
            ORDER BY publication_time ASC
            """
        )
        docs = [dict(r) for r in cur_docs.fetchall()]

        # Run deduplication / circularity detection
        dedup_results = detect_syndication_and_circularity(docs)

        # Step 2: Calculate per-source reliability metrics
        cur_sources = conn.execute(
            """
            SELECT d.source_name, d.reliability_tier,
                   COUNT(DISTINCT d.id) as total_docs,
                   SUM(CASE WHEN d.is_syndicated = 1 THEN 1 ELSE 0 END) as syndicated_docs,
                   COUNT(DISTINCT c.id) as total_claims,
                   SUM(CASE WHEN c.status = 'verified_fact' THEN 1 ELSE 0 END) as verified_claims,
                   SUM(CASE WHEN c.status = 'refuted_or_superseded' THEN 1 ELSE 0 END) as refuted_claims
            FROM documents d
            LEFT JOIN claims c ON d.id = c.document_id
            GROUP BY d.source_name
            ORDER BY total_docs DESC
            """
        )

        # Count first-to-report events per source
        cur_first = conn.execute(
            """
            SELECT d.source_name, COUNT(ev.id) as first_count
            FROM events ev
            JOIN documents d ON ev.document_id = d.id
            GROUP BY d.source_name
            """
        )
        first_map = {r["source_name"]: r["first_count"] for r in cur_first.fetchall()}

        source_metrics: List[SourceReliabilityMetric] = []
        for r in cur_sources.fetchall():
            s_name = r["source_name"]
            tot_claims = r["total_claims"] or 1
            tot_docs = r["total_docs"] or 1
            ver_ratio = round(r["verified_claims"] / tot_claims, 3)
            syn_ratio = round((r["syndicated_docs"] or 0) / tot_docs, 3)

            source_metrics.append(SourceReliabilityMetric(
                source_name=s_name,
                total_documents=r["total_docs"],
                reliability_tier=r["reliability_tier"] or "commercial_threat_intel",
                verified_claims_ratio=ver_ratio,
                refuted_claims_count=r["refuted_claims"] or 0,
                first_to_report_count=first_map.get(s_name, 0),
                syndication_ratio=syn_ratio
            ))

        clusters_out = []
        for c in dedup_results["clusters"]:
            clusters_out.append(SyndicationCluster(
                cluster_id=c["cluster_id"],
                canonical_source=c["canonical_source"],
                original_doc_id=c["original_doc_id"],
                original_doc_title=c["original_doc_title"],
                original_pub_time=c["original_pub_time"],
                syndicated_reprints=c["syndicated_reprints"],
                simhash_similarity=c["simhash_similarity"],
                is_circular_risk=c["is_circular_risk"],
                verdict=c["verdict"]
            ))

        return SourceIntelligenceResponse(
            sources=source_metrics,
            syndication_clusters=clusters_out,
            circular_reporting_warnings=dedup_results["circular_warnings"]
        )
