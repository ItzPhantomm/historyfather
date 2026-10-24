export type ClaimStatus = 
  | 'verified_fact' 
  | 'source_reported' 
  | 'inferred_relationship' 
  | 'unresolved_hypothesis' 
  | 'refuted_or_superseded';

export type CertaintyTier = 'high' | 'medium' | 'low' | 'contested';

export type EntityType = 
  | 'threat_actor' 
  | 'malware' 
  | 'campaign' 
  | 'organization' 
  | 'vulnerability' 
  | 'person' 
  | 'infrastructure' 
  | 'geopolitical_entity';

export interface EntityMatchExplanation {
  query_term: string;
  matched_entity_id: string;
  canonical_name: string;
  matched_alias?: string;
  match_strategy: string;
  similarity_score: number;
  explanation_text: string;
}

export interface SearchResultItem {
  type: 'passage' | 'claim' | 'entity' | 'event';
  id: string;
  title: string;
  snippet: string;
  relevance_score: number;
  publication_time: string;
  event_time?: string;
  observation_time?: string;
  source_name: string;
  document_id: string;
  entity_matches: EntityMatchExplanation[];
  claim_status?: ClaimStatus;
  certainty_tier?: CertaintyTier;
  confidence: number;
}

export interface SearchResponse {
  query?: string;
  total_results: number;
  items: SearchResultItem[];
  resolved_entities: EntityMatchExplanation[];
  active_filters: Record<string, any>;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  event_time_start: string;
  event_time_end?: string;
  first_reported_time: string;
  observation_time?: string;
  ingestion_time: string;
  event_type: string;
  certainty: string;
  primary_entity_id?: string;
  primary_entity_name?: string;
  target_entity_id?: string;
  target_entity_name?: string;
  document_id?: string;
  doc_title?: string;
  source_name?: string;
  source_url?: string;
  passage_text?: string;
  reporting_latency_days?: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  entity_type?: EntityType;
  confidence: number;
  first_seen?: string;
  last_seen?: string;
  degree: number;
  betweenness?: number;
  hub_score?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  relation_type: string;
  status: string;
  confidence: number;
  evidence_count: number;
  first_observed_time?: string;
  is_contested: boolean;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  total_nodes: number;
  total_edges: number;
  time_window?: {
    as_of?: string;
  };
}

export interface RelationshipEvidence {
  id: string;
  relationship_id: string;
  document_id: string;
  document_title?: string;
  source_name?: string;
  passage_id?: string;
  verbatim_quote: string;
  publication_time: string;
  confidence_score: number;
}

export interface ChangedRelationshipDiff {
  relationship_id: string;
  source_name: string;
  target_name: string;
  relation_type: string;
  status_at_a?: string;
  status_at_b: string;
  confidence_at_a?: number;
  confidence_at_b: number;
  diff_type: 'added' | 'status_changed' | 'confidence_increased' | 'confidence_decreased';
  new_evidence_count: number;
}

export interface RevisedClaimDiff {
  claim_id: string;
  claim_text: string;
  subject_name?: string;
  predicate: string;
  object_name?: string;
  status_at_a?: string;
  status_at_b: string;
  certainty_at_a?: string;
  certainty_at_b: string;
  revision_reason?: string;
  diff_type: 'newly_asserted' | 'status_revised' | 'refuted_or_superseded';
}

export interface RetroactiveEvidenceDiff {
  document_id: string;
  document_title: string;
  source_name: string;
  publication_time: string;
  event_time: string;
  passage_text: string;
  explanation: string;
}

export interface TemporalDiffResponse {
  snapshot_a_time: string;
  snapshot_b_time: string;
  target_entity?: string;
  summary: {
    newly_observed_entities_count: number;
    changed_relationships_count: number;
    revised_claims_count: number;
    retroactive_evidence_count: number;
  };
  newly_observed_entities: any[];
  changed_relationships: ChangedRelationshipDiff[];
  revised_claims: RevisedClaimDiff[];
  retroactively_discovered_evidence: RetroactiveEvidenceDiff[];
}

export interface SourceMetric {
  source_name: string;
  total_documents: number;
  reliability_tier: string;
  verified_claims_ratio: number;
  refuted_claims_count: number;
  first_to_report_count: number;
  syndication_ratio: number;
}

export interface SyndicationCluster {
  cluster_id: string;
  canonical_source: string;
  original_doc_id: string;
  original_doc_title: string;
  original_pub_time: string;
  syndicated_reprints: Array<{
    id: string;
    title: string;
    source_name: string;
    publication_time: string;
    hamming_distance: number;
    text_similarity_pct: number;
    is_different_source: boolean;
    is_circular_risk: boolean;
  }>;
  simhash_similarity: number;
  is_circular_risk: boolean;
  verdict: string;
}

export interface SourceIntelligenceResponse {
  sources: SourceMetric[];
  syndication_clusters: SyndicationCluster[];
  circular_reporting_warnings: Array<{
    original_doc_id: string;
    original_title: string;
    original_source: string;
    original_time: string;
    echo_doc_id: string;
    echo_title: string;
    echo_source: string;
    echo_time: string;
    similarity_pct: number;
    warning: string;
  }>;
}

export interface WorkspaceItem {
  id: string;
  workspace_id: string;
  item_type: 'entity' | 'event' | 'claim' | 'passage' | 'document' | 'relationship';
  item_id: string;
  pinned_at: string;
  analyst_note?: string;
  hypothesis_stance: 'supports_hypothesis' | 'refutes_hypothesis' | 'neutral';
  details?: Record<string, any>;
}

export interface WorkspaceNote {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  updated_at: string;
}

export interface WorkspaceDetail {
  id: string;
  title: string;
  description?: string;
  analyst_name: string;
  created_at: string;
  updated_at: string;
  items: WorkspaceItem[];
  notes: WorkspaceNote[];
}
