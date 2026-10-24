import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Calendar, Clock, ArrowRight, ShieldCheck,
  AlertTriangle, FileText, ChevronRight, SlidersHorizontal, Eye,
  Sparkles, History, HelpCircle
} from 'lucide-react';
import { SearchResultItem, TimelineEvent, EntityMatchExplanation } from '../types';
import { api } from '../services/api';

interface SearchTimelineViewProps {
  onSelectEvidence: (item: SearchResultItem) => void;
}

export const SearchTimelineView: React.FC<SearchTimelineViewProps> = ({ onSelectEvidence }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [resolvedEntities, setResolvedEntities] = useState<EntityMatchExplanation[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [timelineMode, setTimelineMode] = useState<'event_time' | 'reporting_time'>('event_time');
  const [asOfDate, setAsOfDate] = useState<string>('');
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'timeline' | 'passages' | 'claims'>('all');

  const executeSearch = async (searchTerm: string, asOf?: string, entityType?: string) => {
    setLoading(true);
    try {
      const searchRes = await api.search({
        query: searchTerm || undefined,
        as_of_time: asOf || undefined,
        entity_types: entityType ? [entityType] : undefined
      });
      setResults(searchRes.items);
      setResolvedEntities(searchRes.resolved_entities);

      // Also fetch timeline
      const timelineRes = await api.getTimeline(undefined, asOf || undefined, timelineMode);
      setTimelineEvents(timelineRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSearch(query, asOfDate, selectedEntityFilter);
  }, [timelineMode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query, asOfDate, selectedEntityFilter);
  };

  const handleQuickPreset = (term: string) => {
    setQuery(term);
    executeSearch(term, asOfDate, selectedEntityFilter);
  };

  return (
    <div className="space-y-6">
      {/* Top Search Console */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-zinc-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search threat actors, malware, campaigns, CVEs, or aliases (e.g. Midnight Blizzard, SUNBURST, NotPetya)..."
              className="w-full bg-[#18181c] border border-zinc-700/80 rounded-lg pl-12 pr-28 py-3.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-semibold uppercase tracking-wider transition-colors disabled:bg-zinc-800"
            >
              {loading ? 'Searching...' : 'Investigate'}
            </button>
          </div>

          {/* Quick Investigation Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-zinc-500 font-mono uppercase text-[11px]">Quick Cases:</span>
            {[
              { label: 'APT29 / SolarWinds', term: 'SolarWinds' },
              { label: 'Sandworm / NotPetya', term: 'NotPetya' },
              { label: 'Midnight Blizzard (2024)', term: 'Midnight Blizzard' },
              { label: 'Lazarus / Ronin Heist', term: 'Axie Infinity' },
              { label: 'Stuxnet Natanz', term: 'Natanz' },
              { label: 'Pegasus NSO', term: 'Pegasus Spyware' }
            ].map((preset) => (
              <button
                key={preset.term}
                type="button"
                onClick={() => handleQuickPreset(preset.term)}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-300 text-xs transition-colors font-mono"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Filter Bar with Point-in-Time Travel */}
          <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Time Travel As-Of Filter */}
            <div className="flex items-center space-x-2 bg-[#18181c] p-2 rounded border border-zinc-800">
              <History className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex-1">
                <label className="text-[10px] uppercase font-mono text-zinc-400 block">
                  Point-In-Time Snapshot ("What was known then?")
                </label>
                <select
                  value={asOfDate}
                  onChange={(e) => {
                    setAsOfDate(e.target.value);
                    executeSearch(query, e.target.value, selectedEntityFilter);
                  }}
                  className="bg-transparent text-xs text-amber-300 font-mono focus:outline-none w-full"
                >
                  <option value="" className="bg-zinc-900">Current Present (Full Timeline)</option>
                  <option value="2020-12-14T00:00:00Z" className="bg-zinc-900">Dec 2020 (Initial SolarWinds Fog of War)</option>
                  <option value="2021-04-16T00:00:00Z" className="bg-zinc-900">April 2021 (Official SVR Attribution)</option>
                  <option value="2022-04-01T00:00:00Z" className="bg-zinc-900">April 2022 (Ronin Bridge Compromise)</option>
                  <option value="2023-01-01T00:00:00Z" className="bg-zinc-900">Jan 2023 (Midpoint Reconstruction)</option>
                </select>
              </div>
            </div>

            {/* Entity Type Filter */}
            <div className="flex items-center space-x-2 bg-[#18181c] p-2 rounded border border-zinc-800">
              <SlidersHorizontal className="w-4 h-4 text-sky-400 shrink-0" />
              <div className="flex-1">
                <label className="text-[10px] uppercase font-mono text-zinc-400 block">Entity Scope</label>
                <select
                  value={selectedEntityFilter}
                  onChange={(e) => {
                    setSelectedEntityFilter(e.target.value);
                    executeSearch(query, asOfDate, e.target.value);
                  }}
                  className="bg-transparent text-xs text-zinc-200 font-mono focus:outline-none w-full"
                >
                  <option value="" className="bg-zinc-900">All Entity Categories</option>
                  <option value="threat_actor" className="bg-zinc-900">Threat Actors</option>
                  <option value="malware" className="bg-zinc-900">Malware & Toolsets</option>
                  <option value="organization" className="bg-zinc-900">Organizations & Targets</option>
                  <option value="infrastructure" className="bg-zinc-900">Infrastructure & Bridges</option>
                  <option value="geopolitical_entity" className="bg-zinc-900">Geopolitical Facilities</option>
                </select>
              </div>
            </div>

            {/* Timeline Sorting Track */}
            <div className="flex items-center space-x-2 bg-[#18181c] p-2 rounded border border-zinc-800">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1">
                <label className="text-[10px] uppercase font-mono text-zinc-400 block">Timeline Ordering Track</label>
                <div className="flex space-x-2 mt-0.5">
                  <button
                    type="button"
                    onClick={() => setTimelineMode('event_time')}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                      timelineMode === 'event_time'
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Event Occurrence (T_event)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineMode('reporting_time')}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                      timelineMode === 'reporting_time'
                        ? 'bg-sky-950/80 text-sky-400 border border-sky-800/80 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Publication / Disclosure (T_pub)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Entity Resolution Match Banner */}
        {resolvedEntities.length > 0 && (
          <div className="mt-4 p-3 bg-sky-950/30 border border-sky-800/50 rounded-lg flex items-start space-x-3 text-xs">
            <Sparkles className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" />
            <div>
              <div className="font-mono text-sky-300 font-semibold mb-0.5">
                Deterministic Entity Resolution: {resolvedEntities[0].query_term} &rarr; {resolvedEntities[0].canonical_name} ({Math.round(resolvedEntities[0].similarity_score * 100)}% Match)
              </div>
              <p className="text-zinc-300 text-[11px]">{resolvedEntities[0].explanation_text}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main View Area Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors ${
              activeTab === 'all'
                ? 'bg-zinc-800 text-sky-400 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Unified Dossier ({results.length + timelineEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors ${
              activeTab === 'timeline'
                ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Chronological Timeline ({timelineEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('passages')}
            className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors ${
              activeTab === 'passages'
                ? 'bg-zinc-800 text-sky-400 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Evidence Passages ({results.filter(r => r.type === 'passage').length})
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors ${
              activeTab === 'claims'
                ? 'bg-zinc-800 text-amber-400 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Attributed Claims ({results.filter(r => r.type === 'claim').length})
          </button>
        </div>

        {asOfDate && (
          <span className="text-xs font-mono text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 rounded">
            Viewing Historical Knowledge as of: {asOfDate.slice(0, 10)}
          </span>
        )}
      </div>

      {/* Timeline Section */}
      {(activeTab === 'all' || activeTab === 'timeline') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>
                Chronological Events Reconstruction ({timelineMode === 'event_time' ? 'Event Occurrence Sequence' : 'Public Disclosure Sequence'})
              </span>
            </h3>
            <span className="text-xs text-zinc-500 font-mono">{timelineEvents.length} Verified Incidents</span>
          </div>

          <div className="relative pl-6 border-l-2 border-zinc-800 space-y-6">
            {timelineEvents.map((evt) => (
              <div
                key={evt.id}
                className="relative bg-[#121215] border border-zinc-800/90 rounded-lg p-4 hover:border-zinc-700 transition-all cursor-pointer group"
                onClick={() => onSelectEvidence({
                  type: 'event',
                  id: evt.id,
                  title: evt.title,
                  snippet: evt.description,
                  relevance_score: 9.0,
                  publication_time: evt.first_reported_time,
                  event_time: evt.event_time_start,
                  observation_time: evt.observation_time,
                  source_name: evt.source_name || 'Consensus Report',
                  document_id: evt.document_id || '',
                  entity_matches: [],
                  certainty_tier: evt.certainty as any,
                  confidence: 0.98
                })}
              >
                {/* Node dot on timeline */}
                <div className="absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full bg-emerald-500 border-4 border-[#09090b] group-hover:scale-125 transition-transform" />

                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {evt.event_type}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                      {evt.certainty}
                    </span>
                  </div>

                  {/* Dual timestamps */}
                  <div className="flex items-center space-x-2 text-[11px] font-mono">
                    <span className="badge-tevt">
                      Event: {evt.event_time_start ? evt.event_time_start.slice(0, 10) : 'N/A'}
                    </span>
                    <span className="badge-tpub">
                      Reported: {evt.first_reported_time ? evt.first_reported_time.slice(0, 10) : 'N/A'}
                    </span>
                    {evt.reporting_latency_days !== undefined && evt.reporting_latency_days > 0 && (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded">
                        +{evt.reporting_latency_days}d latency
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="text-base font-medium text-white group-hover:text-sky-400 transition-colors">
                  {evt.title}
                </h4>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{evt.description}</p>

                {evt.passage_text && (
                  <div className="mt-2.5 p-2 bg-[#18181c] border-l-2 border-emerald-500 text-[11px] text-zinc-300 font-mono line-clamp-2">
                    "{evt.passage_text}"
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/60">
                  <span>Source Document: <strong className="text-zinc-400">{evt.source_name || 'Primary Source'}</strong></span>
                  <span className="text-sky-400 flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Inspect Evidence</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results List (Passages & Claims) */}
      {(activeTab === 'all' || activeTab === 'passages' || activeTab === 'claims') && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <span>Evidence Passages & Claims ({results.length})</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {results.map((res) => (
              <div
                key={res.id}
                onClick={() => onSelectEvidence(res)}
                className="bg-[#121215] border border-zinc-800/90 rounded-lg p-4 hover:border-zinc-700 transition-all cursor-pointer group"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {res.type}
                    </span>
                    {res.claim_status && (
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                        res.claim_status === 'verified_fact' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' :
                        res.claim_status === 'refuted_or_superseded' ? 'bg-rose-950/60 text-rose-400 border-rose-800/60 line-through' :
                        'bg-sky-950/60 text-sky-400 border-sky-800/60'
                      }`}>
                        {res.claim_status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-[11px] font-mono">
                    <span className="badge-tpub">Pub: {res.publication_time.slice(0, 10)}</span>
                    {res.event_time && <span className="badge-tevt">Event: {res.event_time.slice(0, 10)}</span>}
                    <span className="text-zinc-500">Conf: {Math.round(res.confidence * 100)}%</span>
                  </div>
                </div>

                <h4 className="text-sm font-medium text-white group-hover:text-sky-400 transition-colors">
                  {res.title}
                </h4>

                <p className="text-xs text-zinc-300 mt-2 font-mono leading-relaxed bg-[#16161a] p-2.5 rounded border-l-2 border-sky-500">
                  "{res.snippet}"
                </p>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Source: <strong className="text-zinc-400">{res.source_name}</strong></span>
                  <span className="text-sky-400 flex items-center space-x-1">
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
