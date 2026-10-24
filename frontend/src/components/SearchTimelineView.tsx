import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Filter, Calendar, Clock, ArrowRight, ShieldCheck,
  AlertTriangle, FileText, ChevronRight, SlidersHorizontal, Eye,
  Play, Pause, RotateCcw, SkipBack, SkipForward, CheckCircle2,
  ExternalLink, Layers, Terminal, AlertCircle
} from 'lucide-react';
import { SearchResultItem, TimelineEvent, EntityMatchExplanation } from '../types';
import { api } from '../services/api';

interface SearchTimelineViewProps {
  onSelectEvidence: (item: SearchResultItem) => void;
}

const EPOCH_YEARS = [
  { year: '2010', label: '2010 (Stuxnet)', iso: '2010-12-31T23:59:59Z' },
  { year: '2012', label: '2012 (Olympic Games Leak)', iso: '2012-12-31T23:59:59Z' },
  { year: '2015', label: '2015 (BlackEnergy)', iso: '2015-12-31T23:59:59Z' },
  { year: '2017', label: '2017 (NotPetya Outbreak)', iso: '2017-12-31T23:59:59Z' },
  { year: '2020', label: '2020 (SolarWinds/UNC2452)', iso: '2020-12-31T23:59:59Z' },
  { year: '2021', label: '2021 (SVR Formal Attribution)', iso: '2021-12-31T23:59:59Z' },
  { year: '2022', label: '2022 (Ronin Bridge $620M)', iso: '2022-12-31T23:59:59Z' },
  { year: '2024', label: '2024 (Midnight Blizzard)', iso: '2024-12-31T23:59:59Z' },
  { year: 'present', label: 'Present (Unrestricted)', iso: '' }
];

export const SearchTimelineView: React.FC<SearchTimelineViewProps> = ({ onSelectEvidence }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [resolvedEntities, setResolvedEntities] = useState<EntityMatchExplanation[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [timelineMode, setTimelineMode] = useState<'event_time' | 'reporting_time'>('event_time');
  const [asOfDate, setAsOfDate] = useState<string>('');
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'timeline' | 'passages' | 'claims'>('all');

  // Temporal Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(EPOCH_YEARS.length - 1);
  const playbackTimerRef = useRef<any>(null);

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
  }, [timelineMode, asOfDate, selectedEntityFilter]);

  // Handle Playback Interval
  useEffect(() => {
    if (isPlaying) {
      playbackTimerRef.current = setInterval(() => {
        setPlaybackIndex((prev) => {
          const next = (prev + 1) % EPOCH_YEARS.length;
          const target = EPOCH_YEARS[next];
          setAsOfDate(target.iso);
          return next;
        });
      }, 2500);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying]);

  const handleStepEpoch = (direction: 'next' | 'prev') => {
    setIsPlaying(false);
    setPlaybackIndex((prev) => {
      let next = direction === 'next' ? prev + 1 : prev - 1;
      if (next < 0) next = 0;
      if (next >= EPOCH_YEARS.length) next = EPOCH_YEARS.length - 1;
      setAsOfDate(EPOCH_YEARS[next].iso);
      return next;
    });
  };

  const handleSelectEpoch = (index: number) => {
    setIsPlaying(false);
    setPlaybackIndex(index);
    setAsOfDate(EPOCH_YEARS[index].iso);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query, asOfDate, selectedEntityFilter);
  };

  const handleQuickPreset = (term: string) => {
    setQuery(term);
    executeSearch(term, asOfDate, selectedEntityFilter);
  };

  const filteredResults = results.filter(item => {
    if (selectedStatusFilter && item.claim_status !== selectedStatusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Search & Query Input Bar (Monochrome Brutalist) */}
      <div className="tactical-panel p-4 border border-zinc-800">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search threat actors, malware, campaigns, CVEs, or aliases (e.g. Midnight Blizzard, SUNBURST, NotPetya)..."
              className="w-full bg-[#0c0c0e] border border-zinc-800 focus:border-white pl-10 pr-28 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-1.5 px-3 py-1.5 bg-white text-black hover:bg-zinc-200 text-xs font-mono font-semibold tracking-wider transition-colors disabled:bg-zinc-800 disabled:text-zinc-600"
            >
              {loading ? 'ANALYZING...' : 'INVESTIGATE'}
            </button>
          </div>

          {/* Quick Case Selectors */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-zinc-500 text-[10px] tracking-wider uppercase">VERIFIED TARGETS:</span>
            {[
              { label: 'APT29 / SolarWinds', term: 'SolarWinds' },
              { label: 'Sandworm / NotPetya', term: 'NotPetya' },
              { label: 'Midnight Blizzard (2024)', term: 'Midnight Blizzard' },
              { label: 'Lazarus / Ronin Bridge', term: 'Axie Infinity' },
              { label: 'Stuxnet Natanz', term: 'Natanz' },
              { label: 'Pegasus Spyware', term: 'Pegasus Spyware' }
            ].map((preset) => (
              <button
                key={preset.term}
                type="button"
                onClick={() => handleQuickPreset(preset.term)}
                className="px-2 py-0.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-300 text-[11px] transition-colors"
              >
                {preset.label}
              </button>
            ))}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  executeSearch('', asOfDate, selectedEntityFilter);
                }}
                className="text-zinc-500 hover:text-white text-[11px] underline ml-auto"
              >
                Clear Query
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Advanced Interactive Temporal Playback Scrubber (Point-in-Time Forensic Simulation) */}
      <div className="tactical-panel p-3 border border-zinc-800 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 font-mono text-xs">
            <Clock className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-200 font-semibold uppercase tracking-wider">Historical Fog-of-War Scrubber</span>
            <span className="text-zinc-500 text-[10px]">
              [AS OF: {EPOCH_YEARS[playbackIndex].label}]
            </span>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center space-x-1.5 font-mono text-xs">
            <button
              onClick={() => handleStepEpoch('prev')}
              title="Step Backward"
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause Playback' : 'Play Historical Evolution'}
              className="px-2.5 py-1 bg-white hover:bg-zinc-200 text-black font-semibold flex items-center space-x-1 transition-colors"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{isPlaying ? 'PAUSE' : 'PLAY TIMELINE'}</span>
            </button>
            <button
              onClick={() => handleStepEpoch('next')}
              title="Step Forward"
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSelectEpoch(EPOCH_YEARS.length - 1)}
              title="Reset to Present Day"
              className="p-1.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Epoch Stepper Segment Rail */}
        <div className="grid grid-cols-3 sm:grid-cols-9 gap-1 font-mono text-[10px]">
          {EPOCH_YEARS.map((epoch, idx) => {
            const isSelected = playbackIndex === idx;
            return (
              <button
                key={epoch.year}
                onClick={() => handleSelectEpoch(idx)}
                className={`py-1.5 px-1 text-center border transition-all truncate ${
                  isSelected
                    ? 'bg-white text-black border-white font-bold'
                    : 'bg-[#09090b] text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                {epoch.year.toUpperCase()}
              </button>
            );
          })}
        </div>

        <div className="text-[10px] font-mono text-zinc-500 flex items-center justify-between pt-1 border-t border-zinc-900">
          <span>Simulation Mode: Filters all evidence to only records indexed on or before the selected epoch timestamp.</span>
          <span>{asOfDate ? `T_pub <= ${asOfDate.slice(0, 10)}` : 'ALL HISTORICAL DATA'}</span>
        </div>
      </div>

      {/* Resolved Entity Canonical Cards */}
      {resolvedEntities.length > 0 && (
        <div className="tactical-panel p-3 border border-zinc-800 space-y-2">
          <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Deterministic Entity Resolution Matches ({resolvedEntities.length})</span>
            <span className="text-zinc-500">EXPLAINABLE MATCHING // JARO-WINKLER</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {resolvedEntities.map((ent, idx) => (
              <div key={ent.matched_entity_id || idx} className="tactical-card p-2.5 border border-zinc-800">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white font-semibold">{ent.canonical_name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-zinc-900 text-zinc-300 border border-zinc-700">
                    {Math.round(ent.similarity_score * 100)}% Match
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-1">
                  Matched via: <code className="text-zinc-200">"{ent.matched_alias || ent.query_term}"</code> ({ent.match_strategy})
                </div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">
                  {ent.explanation_text}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Investigation Split Rail: Filters & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left Filter Column */}
        <div className="tactical-panel p-3.5 border border-zinc-800 space-y-4 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="font-semibold text-white tracking-wider uppercase text-[11px]">Forensic Filters</span>
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
          </div>

          {/* Timeline View Mode */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider block">Time Coordinate</label>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setTimelineMode('event_time')}
                className={`py-1 px-2 border text-center transition-colors ${
                  timelineMode === 'event_time'
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-[#0c0c0e] text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                Event Time (T_event)
              </button>
              <button
                type="button"
                onClick={() => setTimelineMode('reporting_time')}
                className={`py-1 px-2 border text-center transition-colors ${
                  timelineMode === 'reporting_time'
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-[#0c0c0e] text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                Pub Time (T_pub)
              </button>
            </div>
          </div>

          {/* Entity Type Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider block">Entity Type</label>
            <div className="space-y-1">
              {[
                { id: '', label: 'All Entity Types' },
                { id: 'threat_actor', label: 'Threat Actor' },
                { id: 'malware', label: 'Malware / Tool' },
                { id: 'organization', label: 'Organization' },
                { id: 'vulnerability', label: 'Vulnerability (CVE)' },
                { id: 'infrastructure', label: 'Infrastructure / Bridge' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedEntityFilter(t.id)}
                  className={`w-full text-left px-2 py-1 border transition-colors flex items-center justify-between ${
                    selectedEntityFilter === t.id
                      ? 'bg-white text-black border-white font-semibold'
                      : 'bg-transparent text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Epistemic Status Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider block">Claim Epistemic Status</label>
            <div className="space-y-1">
              {[
                { id: '', label: 'All Statuses' },
                { id: 'verified_fact', label: 'Verified Fact' },
                { id: 'source_reported', label: 'Source Reported' },
                { id: 'unresolved_hypothesis', label: 'Unresolved Hypothesis' },
                { id: 'refuted_or_superseded', label: 'Refuted / Superseded' }
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedStatusFilter(s.id)}
                  className={`w-full text-left px-2 py-1 border transition-colors flex items-center justify-between ${
                    selectedStatusFilter === s.id
                      ? 'bg-white text-black border-white font-semibold'
                      : 'bg-transparent text-zinc-400 border-transparent hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reset Filters */}
          {(selectedEntityFilter || selectedStatusFilter || asOfDate) && (
            <button
              onClick={() => {
                setSelectedEntityFilter('');
                setSelectedStatusFilter('');
                setAsOfDate('');
                setPlaybackIndex(EPOCH_YEARS.length - 1);
              }}
              className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-center font-mono text-xs block transition-colors"
            >
              Reset All Filters
            </button>
          )}
        </div>

        {/* Right Content Stream (Results & Dual-Track Timeline) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Sub-view switcher */}
          <div className="flex items-center space-x-1 border-b border-zinc-800 pb-2">
            {[
              { id: 'all', label: `All Evidence (${filteredResults.length})` },
              { id: 'timeline', label: `Chronological Timeline (${timelineEvents.length})` },
              { id: 'passages', label: 'Source Passages' },
              { id: 'claims', label: 'Claims Ledger' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1 text-xs font-mono tracking-wide transition-colors border ${
                  activeTab === tab.id
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-transparent text-zinc-400 border-transparent hover:text-white hover:border-zinc-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="tactical-panel p-12 text-center border border-zinc-800 font-mono text-xs text-zinc-400">
              [ SCANNING TEMPORAL FTS5 CORPUS & RESOLVING ENTITIES... ]
            </div>
          ) : activeTab === 'timeline' ? (
            /* Dedicated Chronological Timeline Lane */
            <div className="space-y-3 font-mono">
              {timelineEvents.length === 0 ? (
                <div className="tactical-panel p-8 text-center text-zinc-500 text-xs">
                  No chronological events match the temporal filter or query.
                </div>
              ) : (
                timelineEvents.map((evt, idx) => (
                  <div key={evt.id || idx} className="tactical-card p-3 border border-zinc-800 relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 border-b border-zinc-800/80 pb-2 mb-2">
                      <div className="text-white font-bold">{evt.title}</div>
                      <div className="flex items-center space-x-2 text-[11px]">
                        <span className="badge-tevt">T_event: {evt.event_time_start ? evt.event_time_start.slice(0, 10) : 'N/A'}</span>
                        <span className="badge-tpub">T_pub: {evt.first_reported_time ? evt.first_reported_time.slice(0, 10) : 'N/A'}</span>
                      </div>
                    </div>
                    <div className="text-zinc-300 text-xs font-sans leading-relaxed">
                      {evt.description}
                    </div>
                    {evt.passage_text && (
                      <div className="mt-2 text-[11px] text-zinc-400 italic bg-black/60 p-2 border-l-2 border-white">
                        "{evt.passage_text}"
                      </div>
                    )}
                    <div className="mt-2.5 pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500">
                      <div>SOURCE: {evt.source_name || 'Public Disclosure'} ({evt.doc_title})</div>
                      <div>LATENCY: {evt.reporting_latency_days !== undefined ? `${evt.reporting_latency_days}d delta` : 'Direct'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Results Stream (Passages, Claims, Entities) */
            <div className="space-y-3 font-mono">
              {filteredResults.length === 0 ? (
                <div className="tactical-panel p-8 text-center text-zinc-500 text-xs">
                  No forensic records found matching query criteria.
                </div>
              ) : (
                filteredResults.map((item) => (
                  <div key={item.id} className="tactical-card p-3.5 border border-zinc-800 group">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1.5 border-b border-zinc-800/80 pb-2 mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] px-1.5 py-0.2 bg-zinc-900 border border-zinc-700 text-zinc-300 uppercase">
                          {item.type}
                        </span>
                        <span className="text-white font-semibold">{item.title}</span>
                      </div>

                      {/* Timestamps */}
                      <div className="flex items-center space-x-2 text-[11px]">
                        {item.event_time && (
                          <span className="badge-tevt">T_event: {item.event_time.slice(0, 10)}</span>
                        )}
                        <span className="badge-tpub">T_pub: {item.publication_time.slice(0, 10)}</span>
                      </div>
                    </div>

                    {/* Passage text or claim */}
                    <div className={`text-zinc-300 text-xs font-sans leading-relaxed ${item.claim_status === 'refuted_or_superseded' ? 'line-through text-zinc-500' : ''}`}>
                      {item.snippet}
                    </div>

                    {/* Refuted notice if superseded */}
                    {item.claim_status === 'refuted_or_superseded' && (
                      <div className="mt-2 text-[11px] text-zinc-400 bg-zinc-950 p-2 border border-zinc-800 flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-zinc-300 flex-shrink-0" />
                        <span>PRESERVED REVISION: This earlier claim was officially refuted by subsequent forensic telemetry.</span>
                      </div>
                    )}

                    {/* Card Footer: Metadata and Evidence Inspector Button */}
                    <div className="mt-3 pt-2 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-400">
                      <div className="flex items-center space-x-2">
                        <span className="text-zinc-500">SOURCE:</span>
                        <span className="text-zinc-300 font-semibold">{item.source_name}</span>
                        {item.claim_status && (
                          <span className={item.claim_status === 'verified_fact' ? 'badge-fact' : item.claim_status === 'refuted_or_superseded' ? 'badge-refuted' : 'badge-reported'}>
                            {item.claim_status.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => onSelectEvidence(item)}
                        className="px-2 py-0.5 bg-zinc-900 hover:bg-white hover:text-black border border-zinc-700 text-zinc-200 text-[10px] uppercase font-semibold transition-colors flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Evidence</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
