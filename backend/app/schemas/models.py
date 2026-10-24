"""
Pydantic schemas and data validation models for HistoryFather.
Implements the 4-timestamp temporal model, status/certainty taxonomies,
graph representations, and export structures.
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Optional, Any, Literal
from datetime import datetime

# Certainty & Status Taxonomies
ClaimStatus = Literal[
    "verified_fact",
    "source_reported",
    "inferred_relationship",
    "unresolved_hypothesis",
    "refuted_or_superseded"
]

CertaintyTier = Literal["high", "medium", "low", "contested"]

EntityType = Literal[
    "threat_actor",
    "malware",
    "campaign",
    "organization",
    "vulnerability",
    "person",
    "infrastructure",
    "geopolitical_entity"
]

RelationType = Literal[
    "ATTRIBUTED_TO",
    "OPERATES",
    "TARGETS",
    "DEPLOYS",
    "SUBSIDIARY_OF",
    "VARIANT_OF",
    "SPONSORS",
    "COLLABORATES_WITH",
    "EXPLOITS",
    "CONTRADICTS",
    "CORROBORATES"
]

# --- Passage & Document Models ---
class PassageModel(BaseModel):
    id: str
    document_id: str
    passage_index: int
    text: str
    passage_hash: str
    entity_mentions: Optional[List[str]] = Field(default_factory=list)
    claims_count: int = 0
    created_at: str

class DocumentSummary(BaseModel):
    id: str
    title: str
    source_name: str
    source_url: Optional[str] = None
    source_type: str
    publication_time: str
    observation_time: Optional[str] = None
    ingestion_time: str
    is_syndicated: int = 0
    canonical_source_id: Optional[str] = None
    reliability_tier: str
    word_count: int = 0

class DocumentDetail(DocumentSummary):
    raw_content: str
    content_hash: str
    simhash: str
    passages: List[PassageModel] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = None

# --- Entity Models ---
class EntityAliasModel(BaseModel):
    id: str
    entity_id: str
    alias: str
    normalized_alias: str
    alias_type: str
    source_id: Optional[str] = None
    confidence: float = 0.95
    notes: Optional[str] = None

class EntityModel(BaseModel):
    id: str
    canonical_name: str
    entity_type: EntityType
    first_observed_time: Optional[str] = None
    last_observed_time: Optional[str] = None
    summary: Optional[str] = None
    confidence_score: float = 1.0
    resolution_status: str = "canonical"
    aliases: List[EntityAliasModel] = Field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = None

class EntityMatchExplanation(BaseModel):
    query_term: str
    matched_entity_id: str
    canonical_name: str
    matched_alias: Optional[str] = None
    match_strategy: str # exact_canonical, exact_alias, fuzzy_token, jaro_winkler, indicator_overlap
    similarity_score: float
    explanation_text: str

# --- Claim & Revision Models ---
class ClaimRevisionModel(BaseModel):
    id: str
    claim_id: str
    revision_number: int
    prior_status: str
    new_status: str
    prior_confidence: float
    new_confidence: float
    revision_reason: str
    evidence_document_id: Optional[str] = None
    evidence_document_title: Optional[str] = None
    revised_at: str

class ClaimModel(BaseModel):
    id: str
    document_id: str
    document_title: Optional[str] = None
    source_name: Optional[str] = None
    passage_id: Optional[str] = None
    verbatim_passage: Optional[str] = None
    subject_entity_id: Optional[str] = None
    subject_name: Optional[str] = None
    predicate: str
    object_entity_id: Optional[str] = None
    object_name: Optional[str] = None
    object_literal: Optional[str] = None
    claim_text: str
    status: ClaimStatus
    certainty_tier: CertaintyTier
    confidence_score: float
    publication_time: str
    alleged_event_time: Optional[str] = None
    observation_time: Optional[str] = None
    superseded_by_claim_id: Optional[str] = None
    refuted_by_document_id: Optional[str] = None
    contradiction_reason: Optional[str] = None
    is_active: int = 1
    revisions: List[ClaimRevisionModel] = Field(default_factory=list)

# --- Event Model ---
class EventModel(BaseModel):
    id: str
    title: str
    description: str
    event_time_start: str # T_event
    event_time_end: Optional[str] = None
    first_reported_time: str # T_pub
    observation_time: Optional[str] = None # T_obs
    ingestion_time: str # T_ingest
    event_type: str
    certainty: str
    primary_entity_id: Optional[str] = None
    primary_entity_name: Optional[str] = None
    target_entity_id: Optional[str] = None
    target_entity_name: Optional[str] = None
    document_id: Optional[str] = None
    document_title: Optional[str] = None
    passage_text: Optional[str] = None

# --- Relationship & Graph Models ---
class RelationshipEvidenceModel(BaseModel):
    id: str
    relationship_id: str
    document_id: str
    document_title: Optional[str] = None
    source_name: Optional[str] = None
    passage_id: Optional[str] = None
    verbatim_quote: str
    publication_time: str
    confidence_score: float

class RelationshipModel(BaseModel):
    id: str
    source_entity_id: str
    source_name: str
    target_entity_id: str
    target_name: str
    relation_type: str
    status: str
    confidence_score: float
    first_observed_time: Optional[str] = None
    last_observed_time: Optional[str] = None
    independent_sources_count: int = 1
    is_contested: int = 0
    notes: Optional[str] = None
    evidence: List[RelationshipEvidenceModel] = Field(default_factory=list)

class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    entity_type: Optional[str] = None
    confidence: float = 1.0
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    degree: int = 0

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    relation_type: str
    status: str
    confidence: float
    evidence_count: int
    first_observed_time: Optional[str] = None
    is_contested: bool = False

class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    total_nodes: int
    total_edges: int
    time_window: Optional[Dict[str, Optional[str]]] = None

# --- Temporal Search & Filter Query ---
class TemporalSearchQuery(BaseModel):
    query: Optional[str] = Field(default=None, max_length=256)
    entity_types: Optional[List[EntityType]] = None
    claim_statuses: Optional[List[ClaimStatus]] = None
    certainty_tiers: Optional[List[CertaintyTier]] = None
    sources: Optional[List[str]] = Field(default=None, max_length=50)
    pub_time_min: Optional[str] = Field(default=None, max_length=50)
    pub_time_max: Optional[str] = Field(default=None, max_length=50)
    event_time_min: Optional[str] = Field(default=None, max_length=50)
    event_time_max: Optional[str] = Field(default=None, max_length=50)
    as_of_time: Optional[str] = Field(default=None, max_length=50) # Point-in-time "what was known then"
    limit: int = Field(default=25, ge=1, le=100)
    offset: int = Field(default=0, ge=0, le=10000)

class SearchResultItem(BaseModel):
    type: Literal["passage", "claim", "entity", "event"]
    id: str
    title: str
    snippet: str
    relevance_score: float
    publication_time: str
    event_time: Optional[str] = None
    observation_time: Optional[str] = None
    source_name: str
    document_id: str
    entity_matches: List[EntityMatchExplanation] = Field(default_factory=list)
    claim_status: Optional[str] = None
    certainty_tier: Optional[str] = None
    confidence: float = 1.0

class SearchResponse(BaseModel):
    query: Optional[str]
    total_results: int
    items: List[SearchResultItem]
    resolved_entities: List[EntityMatchExplanation] = Field(default_factory=list)
    active_filters: Dict[str, Any]

# --- Temporal Diff Models ---
class TemporalDiffRequest(BaseModel):
    snapshot_a_time: str = Field(..., min_length=4, max_length=50) # Date A (e.g. "2021-01-01T00:00:00Z")
    snapshot_b_time: str = Field(..., min_length=4, max_length=50) # Date B (e.g. "2024-01-01T00:00:00Z")
    entity_id: Optional[str] = Field(default=None, max_length=128)

class ChangedRelationshipDiff(BaseModel):
    relationship_id: str
    source_name: str
    target_name: str
    relation_type: str
    status_at_a: Optional[str] = None
    status_at_b: str
    confidence_at_a: Optional[float] = None
    confidence_at_b: float
    diff_type: Literal["added", "status_changed", "confidence_increased", "confidence_decreased"]
    new_evidence_count: int

class RevisedClaimDiff(BaseModel):
    claim_id: str
    claim_text: str
    subject_name: Optional[str] = None
    predicate: str
    object_name: Optional[str] = None
    status_at_a: Optional[str] = None
    status_at_b: str
    certainty_at_a: Optional[str] = None
    certainty_at_b: str
    revision_reason: Optional[str] = None
    diff_type: Literal["newly_asserted", "status_revised", "refuted_or_superseded"]

class RetroactiveEvidenceDiff(BaseModel):
    document_id: str
    document_title: str
    source_name: str
    publication_time: str # Published during [A, B]
    event_time: str # But happened BEFORE A!
    passage_text: str
    explanation: str

class TemporalDiffResponse(BaseModel):
    snapshot_a_time: str
    snapshot_b_time: str
    target_entity: Optional[str] = None
    summary: Dict[str, Any]
    newly_observed_entities: List[EntityModel]
    changed_relationships: List[ChangedRelationshipDiff]
    revised_claims: List[RevisedClaimDiff]
    retroactively_discovered_evidence: List[RetroactiveEvidenceDiff]

# --- Source Intelligence Models ---
class SyndicationCluster(BaseModel):
    cluster_id: str
    canonical_source: str
    original_doc_id: str
    original_doc_title: str
    original_pub_time: str
    syndicated_reprints: List[Dict[str, Any]]
    simhash_similarity: float
    is_circular_risk: bool
    verdict: str

class SourceReliabilityMetric(BaseModel):
    source_name: str
    total_documents: int
    reliability_tier: str
    verified_claims_ratio: float
    refuted_claims_count: int
    first_to_report_count: int
    syndication_ratio: float

class SourceIntelligenceResponse(BaseModel):
    sources: List[SourceReliabilityMetric]
    syndication_clusters: List[SyndicationCluster]
    circular_reporting_warnings: List[Dict[str, Any]]

# --- Investigation Workspace Models ---
class WorkspaceItemAdd(BaseModel):
    item_type: Literal["entity", "event", "claim", "passage", "document", "relationship"]
    item_id: str = Field(..., min_length=1, max_length=128)
    analyst_note: Optional[str] = Field(default=None, max_length=5000)
    hypothesis_stance: Literal["supports_hypothesis", "refutes_hypothesis", "neutral"] = "neutral"

class WorkspaceNoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=50000)

class WorkspaceCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    analyst_name: Optional[str] = Field(default="Lead Investigator", max_length=100)

class WorkspaceDetail(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    analyst_name: str
    created_at: str
    updated_at: str
    items: List[Dict[str, Any]] = Field(default_factory=list)
    notes: List[Dict[str, Any]] = Field(default_factory=list)

# --- Ingestion Models ---
class IngestDocumentRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    source_name: str = Field(..., min_length=1, max_length=150)
    source_url: Optional[str] = Field(default=None, max_length=2048)
    source_type: str = Field(default="threat_report", max_length=50)
    publication_time: str = Field(..., min_length=4, max_length=50)
    observation_time: Optional[str] = Field(default=None, max_length=50)
    content: str = Field(..., min_length=10, max_length=250000)
    reliability_tier: str = Field(default="commercial_threat_intel", max_length=50)

class IngestDocumentResponse(BaseModel):
    document_id: str
    title: str
    passages_count: int
    extracted_entities: List[str]
    extracted_claims_count: int
    is_near_duplicate: bool
    near_duplicate_of: Optional[str] = None
    simhash_distance: Optional[int] = None
