-- HistoryFather Temporal Intelligence Database Schema
-- Strict Four-Timestamp Model:
--   publication_time (T_pub): when report was published
--   event_time (T_event): when event allegedly happened
--   observation_time (T_obs): when sensor/analyst first observed it
--   ingestion_time (T_ingest): when HistoryFather indexed it

PRAGMA foreign_keys = ON;

-- 1. Documents (Reports, Advisories, Legal Indictments, Research Papers)
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT,
    source_type TEXT NOT NULL, -- advisory, threat_report, legal_indictment, news_report, technical_paper
    publication_time TEXT NOT NULL,
    observation_time TEXT,
    ingestion_time TEXT NOT NULL,
    raw_content TEXT NOT NULL,
    content_hash TEXT NOT NULL UNIQUE,
    simhash TEXT NOT NULL,
    is_syndicated INTEGER DEFAULT 0,
    canonical_source_id TEXT REFERENCES documents(id),
    reliability_tier TEXT DEFAULT 'high', -- verified_official, commercial_threat_intel, independent_research, journalism, unverified
    word_count INTEGER DEFAULT 0,
    metadata JSON
);

CREATE INDEX IF NOT EXISTS idx_docs_pub_time ON documents(publication_time);
CREATE INDEX IF NOT EXISTS idx_docs_source ON documents(source_name);
CREATE INDEX IF NOT EXISTS idx_docs_simhash ON documents(simhash);

-- 2. Passages (Verbatim chunks linked directly to documents for exact evidence provenance)
CREATE TABLE IF NOT EXISTS passages (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    passage_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    passage_hash TEXT NOT NULL,
    entity_mentions JSON,
    claims_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_passages_doc ON passages(document_id);

-- 3. FTS5 Virtual Table for Fast Full-Text Evidence Retrieval
CREATE VIRTUAL TABLE IF NOT EXISTS fts_passages USING fts5(
    passage_id UNINDEXED,
    document_id UNINDEXED,
    document_title,
    source_name,
    passage_text,
    tokenize='porter unicode61'
);

-- 4. Entities (Canonicalized or Clustered Real-World Entities)
CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    canonical_name TEXT NOT NULL UNIQUE,
    entity_type TEXT NOT NULL, -- threat_actor, malware, campaign, organization, vulnerability, person, infrastructure, geopolitical_entity
    first_observed_time TEXT,
    last_observed_time TEXT,
    summary TEXT,
    confidence_score REAL DEFAULT 1.0,
    resolution_status TEXT DEFAULT 'canonical', -- canonical, resolved_cluster, pending_review
    metadata JSON
);

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(canonical_name);

-- 5. Entity Aliases & Codename Cross-References
CREATE TABLE IF NOT EXISTS entity_aliases (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    normalized_alias TEXT NOT NULL,
    alias_type TEXT DEFAULT 'synonym', -- synonym, codename, tracking_id, cve_id, former_name, acronym
    source_id TEXT REFERENCES documents(id),
    confidence REAL DEFAULT 0.95,
    notes TEXT,
    UNIQUE(entity_id, normalized_alias)
);

CREATE INDEX IF NOT EXISTS idx_aliases_norm ON entity_aliases(normalized_alias);

-- 6. Historical Events (Chronological physical/cyber milestones)
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_time_start TEXT NOT NULL,
    event_time_end TEXT,
    first_reported_time TEXT NOT NULL,
    observation_time TEXT,
    ingestion_time TEXT NOT NULL,
    event_type TEXT NOT NULL, -- compromise, breach, disclosure, attribution, indictment, patch, takedown
    certainty TEXT DEFAULT 'confirmed', -- confirmed, probable, contested, disputed
    primary_entity_id TEXT REFERENCES entities(id),
    target_entity_id TEXT REFERENCES entities(id),
    document_id TEXT REFERENCES documents(id),
    passage_id TEXT REFERENCES passages(id),
    metadata JSON
);

CREATE INDEX IF NOT EXISTS idx_events_time_start ON events(event_time_start);
CREATE INDEX IF NOT EXISTS idx_events_first_rep ON events(first_reported_time);
CREATE INDEX IF NOT EXISTS idx_events_primary_entity ON events(primary_entity_id);

-- 7. Claims (Atomized, attributable assertions made by sources)
CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    passage_id TEXT REFERENCES passages(id),
    subject_entity_id TEXT REFERENCES entities(id),
    predicate TEXT NOT NULL, -- ATTRIBUTED_TO, OPERATES, TARGETS, DEPLOYS, COLLABORATES_WITH, EXPLOITS, ORIGINATES_FROM, CONTRADICTS
    object_entity_id TEXT REFERENCES entities(id),
    object_literal TEXT,
    claim_text TEXT NOT NULL,
    status TEXT NOT NULL, -- verified_fact, source_reported, inferred_relationship, unresolved_hypothesis, refuted_or_superseded
    certainty_tier TEXT NOT NULL, -- high, medium, low, contested
    confidence_score REAL NOT NULL, -- 0.0 to 1.0
    publication_time TEXT NOT NULL,
    alleged_event_time TEXT,
    observation_time TEXT,
    superseded_by_claim_id TEXT REFERENCES claims(id),
    refuted_by_document_id TEXT REFERENCES documents(id),
    contradiction_reason TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_claims_subject ON claims(subject_entity_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_pub_time ON claims(publication_time);
CREATE INDEX IF NOT EXISTS idx_claims_event_time ON claims(alleged_event_time);

-- 8. Claim Revisions (Preserves historical evolution & prevents silent overwrites)
CREATE TABLE IF NOT EXISTS claim_revisions (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    prior_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    prior_confidence REAL NOT NULL,
    new_confidence REAL NOT NULL,
    revision_reason TEXT NOT NULL,
    evidence_document_id TEXT REFERENCES documents(id),
    revised_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_claim_rev_claim ON claim_revisions(claim_id);

-- 9. Relationships (Knowledge Graph Edges with confidence and status)
CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY,
    source_entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    target_entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL,
    status TEXT NOT NULL, -- verified, probable, contested, historical_superseded
    confidence_score REAL DEFAULT 0.8,
    first_observed_time TEXT,
    last_observed_time TEXT,
    independent_sources_count INTEGER DEFAULT 1,
    is_contested INTEGER DEFAULT 0,
    notes TEXT,
    UNIQUE(source_entity_id, target_entity_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_rel_src ON relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_rel_tgt ON relationships(target_entity_id);

-- 10. Relationship Evidence (Backs EVERY edge with traceable passage excerpts)
CREATE TABLE IF NOT EXISTS relationship_evidence (
    id TEXT PRIMARY KEY,
    relationship_id TEXT NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    passage_id TEXT REFERENCES passages(id),
    claim_id TEXT REFERENCES claims(id),
    verbatim_quote TEXT NOT NULL,
    publication_time TEXT NOT NULL,
    confidence_score REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rel_ev_rel ON relationship_evidence(relationship_id);

-- 11. Workspaces (Investigation Case Management)
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    analyst_name TEXT DEFAULT 'Lead Investigator',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 12. Workspace Bookmarked Items (Dossier compilation)
CREATE TABLE IF NOT EXISTS workspace_items (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL, -- entity, event, claim, passage, document, relationship
    item_id TEXT NOT NULL,
    pinned_at TEXT NOT NULL,
    analyst_note TEXT,
    hypothesis_stance TEXT DEFAULT 'neutral', -- supports_hypothesis, refutes_hypothesis, neutral
    UNIQUE(workspace_id, item_type, item_id)
);

-- 13. Workspace Notes & Findings
CREATE TABLE IF NOT EXISTS workspace_notes (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
