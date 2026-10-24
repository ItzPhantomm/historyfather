import {
  SearchResponse, TimelineEvent, GraphResponse, RelationshipEvidence,
  TemporalDiffResponse, SourceIntelligenceResponse, WorkspaceDetail
} from '../types';

const BASE_URL = '';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, options);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API Error [${res.status}]: ${errText}`);
  }
  return res.json();
}

export const api = {
  async getStatus(): Promise<{ status: string; metrics: Record<string, number> }> {
    return fetchJson('/api/status');
  },

  async search(params: {
    query?: string;
    entity_types?: string[];
    claim_statuses?: string[];
    certainty_tiers?: string[];
    sources?: string[];
    pub_time_min?: string;
    pub_time_max?: string;
    event_time_min?: string;
    event_time_max?: string;
    as_of_time?: string;
  }): Promise<SearchResponse> {
    return fetchJson('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
  },

  async getTimeline(entityId?: string, asOfTime?: string, timeMode: 'event_time' | 'reporting_time' = 'event_time'): Promise<TimelineEvent[]> {
    const query = new URLSearchParams();
    if (entityId) query.set('entity_id', entityId);
    if (asOfTime) query.set('as_of_time', asOfTime);
    query.set('time_mode', timeMode);
    return fetchJson(`/api/timeline?${query.toString()}`);
  },

  async getGraph(params?: {
    as_of_time?: string;
    entity_id?: string;
    hops?: number;
    min_confidence?: number;
  }): Promise<GraphResponse> {
    const query = new URLSearchParams();
    if (params?.as_of_time) query.set('as_of_time', params.as_of_time);
    if (params?.entity_id) query.set('entity_id', params.entity_id);
    if (params?.hops) query.set('hops', String(params.hops));
    if (params?.min_confidence !== undefined) query.set('min_confidence', String(params.min_confidence));
    return fetchJson(`/api/graph?${query.toString()}`);
  },

  async findPath(sourceId: string, targetId: string): Promise<any[]> {
    return fetchJson(`/api/graph/path?source_id=${encodeURIComponent(sourceId)}&target_id=${encodeURIComponent(targetId)}`);
  },

  async getEdgeEvidence(relationshipId: string): Promise<RelationshipEvidence[]> {
    return fetchJson(`/api/relationships/${encodeURIComponent(relationshipId)}/evidence`);
  },

  async compareSnapshots(snapshotA: string, snapshotB: string, entityId?: string): Promise<TemporalDiffResponse> {
    return fetchJson('/api/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        snapshot_a_time: snapshotA,
        snapshot_b_time: snapshotB,
        entity_id: entityId
      })
    });
  },

  async getEntities(type?: string, q?: string): Promise<any[]> {
    const query = new URLSearchParams();
    if (type) query.set('entity_type', type);
    if (q) query.set('q', q);
    return fetchJson(`/api/entities?${query.toString()}`);
  },

  async getEntityDetail(id: string): Promise<any> {
    return fetchJson(`/api/entities/${encodeURIComponent(id)}`);
  },

  async resolveTerm(term: string): Promise<any[]> {
    return fetchJson(`/api/entities/resolve?term=${encodeURIComponent(term)}`, {
      method: 'POST'
    });
  },

  async getSourceIntelligence(): Promise<SourceIntelligenceResponse> {
    return fetchJson('/api/sources');
  },

  async getWorkspaces(): Promise<any[]> {
    return fetchJson('/api/workspaces');
  },

  async createWorkspace(data: { title: string; description?: string; analyst_name?: string }): Promise<WorkspaceDetail> {
    return fetchJson('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async getWorkspace(id: string): Promise<WorkspaceDetail> {
    return fetchJson(`/api/workspaces/${encodeURIComponent(id)}`);
  },

  async addWorkspaceItem(workspaceId: string, item: {
    item_type: string;
    item_id: string;
    analyst_note?: string;
    hypothesis_stance?: string;
  }): Promise<any> {
    return fetchJson(`/api/workspaces/${encodeURIComponent(workspaceId)}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
  },

  async removeWorkspaceItem(workspaceId: string, itemId: string): Promise<any> {
    return fetchJson(`/api/workspaces/${encodeURIComponent(workspaceId)}/items/${encodeURIComponent(itemId)}`, {
      method: 'DELETE'
    });
  },

  async addWorkspaceNote(workspaceId: string, note: { title: string; content: string }): Promise<any> {
    return fetchJson(`/api/workspaces/${encodeURIComponent(workspaceId)}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    });
  },

  async ingestDocument(doc: {
    title: string;
    source_name: string;
    source_url?: string;
    source_type?: string;
    publication_time: string;
    observation_time?: string;
    content: string;
    reliability_tier?: string;
  }): Promise<any> {
    return fetchJson('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    });
  },

  async reseed(): Promise<any> {
    return fetchJson('/api/admin/reseed', {
      method: 'POST',
      headers: {
        'X-Admin-Confirm': 'reseed'
      }
    });
  }
};
