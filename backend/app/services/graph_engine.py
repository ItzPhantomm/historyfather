"""
Temporal Graph Engine for HistoryFather.
Constructs and projects entity relationship networks backed by traceable evidence.
Supports NetworkX graph algorithms:
  1. Time-bounded graph projections (What was the graph structure as of Date T?)
  2. Ego subgraphs & neighborhood expansion
  3. Shortest path & multi-hop intelligence correlation
  4. Degree centrality and key bridge nodes
  5. Traceable edge evidence resolution
"""

import networkx as nx
from typing import List, Dict, Any, Optional, Tuple
from app.db.database import get_connection, row_to_dict, rows_to_dicts
from app.schemas.models import (
    GraphResponse, GraphNode, GraphEdge, RelationshipEvidenceModel
)

class TemporalGraphEngine:
    def __init__(self, db_conn=None):
        self.conn = db_conn

    def _get_conn(self):
        return self.conn or get_connection()

    def get_graph(
        self,
        as_of_time: Optional[str] = None,
        entity_id: Optional[str] = None,
        hops: int = 2,
        min_confidence: float = 0.0,
        relation_types: Optional[List[str]] = None
    ) -> GraphResponse:
        """
        Build and project the entity relationship graph.
        Respects temporal boundary 'as_of_time' (only includes evidence published on/before as_of_time).
        """
        conn = self._get_conn()
        G = nx.MultiDiGraph()

        # Step 1: Query relationships and filter by evidence timestamps
        evidence_filter = ""
        params: List[Any] = []
        if as_of_time:
            evidence_filter = "AND re.publication_time <= ?"
            params.append(as_of_time)

        rel_query = f"""
        SELECT r.id, r.source_entity_id, r.target_entity_id, r.relation_type, r.status,
               r.confidence_score, r.first_observed_time, r.is_contested,
               e1.canonical_name as src_name, e1.entity_type as src_type, e1.confidence_score as src_conf,
               e2.canonical_name as tgt_name, e2.entity_type as tgt_type, e2.confidence_score as tgt_conf,
               COUNT(re.id) as evidence_count
        FROM relationships r
        JOIN entities e1 ON r.source_entity_id = e1.id
        JOIN entities e2 ON r.target_entity_id = e2.id
        LEFT JOIN relationship_evidence re ON r.id = re.relationship_id {evidence_filter}
        GROUP BY r.id
        HAVING evidence_count > 0 AND r.confidence_score >= ?
        """
        params.append(min_confidence)

        cur = conn.execute(rel_query, params)
        rows = cur.fetchall()

        for r in rows:
            src_id = r["source_entity_id"]
            tgt_id = r["target_entity_id"]
            rel_id = r["id"]

            if relation_types and r["relation_type"] not in relation_types:
                continue

            # Add nodes
            if not G.has_node(src_id):
                G.add_node(
                    src_id,
                    label=r["src_name"],
                    entity_type=r["src_type"],
                    confidence=r["src_conf"],
                    first_seen=r["first_observed_time"]
                )
            if not G.has_node(tgt_id):
                G.add_node(
                    tgt_id,
                    label=r["tgt_name"],
                    entity_type=r["tgt_type"],
                    confidence=r["tgt_conf"],
                    first_seen=r["first_observed_time"]
                )

            # Add edge
            G.add_edge(
                src_id,
                tgt_id,
                key=rel_id,
                id=rel_id,
                label=r["relation_type"],
                relation_type=r["relation_type"],
                status=r["status"],
                confidence=r["confidence_score"],
                evidence_count=r["evidence_count"],
                first_observed_time=r["first_observed_time"],
                is_contested=bool(r["is_contested"])
            )

        # Step 2: If focused on a specific entity, extract ego-subgraph
        active_nodes = set(G.nodes)
        if entity_id and entity_id in G:
            # Undirected view for BFS neighborhood search
            uG = G.to_undirected()
            subgraph_nodes = {entity_id}
            frontier = {entity_id}
            for _ in range(hops):
                next_frontier = set()
                for node in frontier:
                    for neighbor in uG.neighbors(node):
                        if neighbor not in subgraph_nodes:
                            subgraph_nodes.add(neighbor)
                            next_frontier.add(neighbor)
                frontier = next_frontier
            active_nodes = subgraph_nodes

        # Step 3: Format output nodes and edges
        degrees = dict(G.degree())
        out_nodes: List[GraphNode] = []
        for n in active_nodes:
            ndata = G.nodes[n]
            out_nodes.append(GraphNode(
                id=n,
                label=ndata.get("label", n),
                type="entity",
                entity_type=ndata.get("entity_type"),
                confidence=ndata.get("confidence", 1.0),
                first_seen=ndata.get("first_seen"),
                degree=degrees.get(n, 0)
            ))

        out_edges: List[GraphEdge] = []
        for u, v, k, edata in G.edges(keys=True, data=True):
            if u in active_nodes and v in active_nodes:
                out_edges.append(GraphEdge(
                    id=edata["id"],
                    source=u,
                    target=v,
                    label=edata["label"],
                    relation_type=edata["relation_type"],
                    status=edata["status"],
                    confidence=edata["confidence"],
                    evidence_count=edata["evidence_count"],
                    first_observed_time=edata["first_observed_time"],
                    is_contested=edata["is_contested"]
                ))

        return GraphResponse(
            nodes=out_nodes,
            edges=out_edges,
            total_nodes=len(out_nodes),
            total_edges=len(out_edges),
            time_window={"as_of": as_of_time}
        )

    def find_path(self, source_id: str, target_id: str) -> List[Dict[str, Any]]:
        """Find the shortest connection path between two entities and return connecting edges."""
        graph_resp = self.get_graph()
        G = nx.Graph()
        for e in graph_resp.edges:
            G.add_edge(e.source, e.target, edge_data=e)

        if not G.has_node(source_id) or not G.has_node(target_id):
            return []

        try:
            path_nodes = nx.shortest_path(G, source=source_id, target=target_id)
            path_result = []
            for i in range(len(path_nodes) - 1):
                u = path_nodes[i]
                v = path_nodes[i + 1]
                edata = G.get_edge_data(u, v)["edge_data"]
                path_result.append({
                    "from_node": u,
                    "to_node": v,
                    "relation_type": edata.relation_type,
                    "confidence": edata.confidence,
                    "edge_id": edata.id
                })
            return path_result
        except nx.NetworkXNoPath:
            return []

    def get_edge_evidence(self, relationship_id: str) -> List[RelationshipEvidenceModel]:
        """Fetch all traceable evidence excerpts backing a relationship edge."""
        conn = self._get_conn()
        cur = conn.execute(
            """
            SELECT re.*, d.title as doc_title, d.source_name
            FROM relationship_evidence re
            JOIN documents d ON re.document_id = d.id
            WHERE re.relationship_id = ?
            ORDER BY re.publication_time DESC
            """,
            (relationship_id,)
        )
        return [RelationshipEvidenceModel(**row_to_dict(r)) for r in cur.fetchall()]
