import React, { useState, useEffect } from 'react';
import {
  GitCompare, Calendar, ArrowRight, ShieldCheck, AlertOctagon,
  Sparkles, History, HelpCircle, CheckCircle2, RefreshCw
} from 'lucide-react';
import { TemporalDiffResponse } from '../types';
import { api } from '../services/api';

export const TemporalDiffView: React.FC = () => {
  const [snapshotA, setSnapshotA] = useState<string>('2020-12-14T00:00:00Z');
  const [snapshotB, setSnapshotB] = useState<string>('2024-02-01T00:00:00Z');
  const [diffData, setDiffData] = useState<TemporalDiffResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'entities' | 'relationships' | 'claims' | 'retroactive'>('all');

  const executeDiff = async (timeA: string, timeB: string) => {
    setLoading(true);
    try {
      const data = await api.compareSnapshots(timeA, timeB);
      setDiffData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeDiff(snapshotA, snapshotB);
  }, []);

  const handleApplyPreset = (timeA: string, timeB: string) => {
    setSnapshotA(timeA);
    setSnapshotB(timeB);
    executeDiff(timeA, timeB);
  };

  return (
    <div className="space-y-6">
      {/* Header & Preset Switcher */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <GitCompare className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-semibold text-white">Temporal Comparison ("Diff Engine")</h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            Isolating what was known at Snapshot A vs newly revealed or revised by Snapshot B
          </span>
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-[#18181c] p-3 rounded-lg border border-zinc-800 space-y-1">
            <label className="text-[10px] uppercase font-mono text-zinc-400 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Snapshot A (Baseline Knowledge Horizon)</span>
            </label>
            <input
              type="text"
              value={snapshotA}
              onChange={(e) => setSnapshotA(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-xs text-sky-300 font-mono focus:outline-none"
            />
          </div>

          <div className="bg-[#18181c] p-3 rounded-lg border border-zinc-800 space-y-1">
            <label className="text-[10px] uppercase font-mono text-zinc-400 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Snapshot B (Subsequent Knowledge Horizon)</span>
            </label>
            <input
              type="text"
              value={snapshotB}
              onChange={(e) => setSnapshotB(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-xs text-emerald-300 font-mono focus:outline-none"
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800 text-xs">
          <span className="text-zinc-500 font-mono uppercase text-[11px]">Historical Comparison Presets:</span>
          {[
            {
              label: 'SolarWinds Fog of War (Dec 2020) vs CISA SVR Attribution (April 2021)',
              a: '2020-12-14T00:00:00Z',
              b: '2021-04-16T00:00:00Z'
            },
            {
              label: 'NotPetya Outbreak (2017) vs GRU Unit 74455 Indictment (2020)',
              a: '2017-06-28T00:00:00Z',
              b: '2020-10-20T00:00:00Z'
            },
            {
              label: 'Ronin Bridge Breach (March 2022) vs FBI Attribution (April 2022)',
              a: '2022-03-24T00:00:00Z',
              b: '2022-04-15T00:00:00Z'
            },
            {
              label: 'Full Retrospective Decade (2014 vs 2024)',
              a: '2014-01-01T00:00:00Z',
              b: '2024-02-01T00:00:00Z'
            }
          ].map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(preset.a, preset.b)}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-300 font-mono text-[11px] transition-colors"
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => executeDiff(snapshotA, snapshotB)}
            disabled={loading}
            className="ml-auto px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-mono font-medium transition-colors"
          >
            {loading ? 'Comparing...' : 'Run Comparison'}
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      {diffData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div
            onClick={() => setActiveTab('entities')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'entities' ? 'bg-emerald-950/40 border-emerald-500' : 'bg-[#121215] border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <span className="text-[10px] font-mono uppercase text-emerald-400 block mb-1">Newly Observed Entities</span>
            <div className="text-2xl font-bold font-mono text-emerald-300">{diffData.summary.newly_observed_entities_count}</div>
            <div className="text-[11px] text-zinc-400 mt-1">First reported in window</div>
          </div>

          <div
            onClick={() => setActiveTab('relationships')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'relationships' ? 'bg-sky-950/40 border-sky-500' : 'bg-[#121215] border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <span className="text-[10px] font-mono uppercase text-sky-400 block mb-1">Changed Relationships</span>
            <div className="text-2xl font-bold font-mono text-sky-300">{diffData.summary.changed_relationships_count}</div>
            <div className="text-[11px] text-zinc-400 mt-1">New links or confidence shifts</div>
          </div>

          <div
            onClick={() => setActiveTab('claims')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'claims' ? 'bg-rose-950/40 border-rose-500' : 'bg-[#121215] border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <span className="text-[10px] font-mono uppercase text-rose-400 block mb-1">Revised / Refuted Claims</span>
            <div className="text-2xl font-bold font-mono text-rose-300">{diffData.summary.revised_claims_count}</div>
            <div className="text-[11px] text-zinc-400 mt-1">Superseded or retracted</div>
          </div>

          <div
            onClick={() => setActiveTab('retroactive')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'retroactive' ? 'bg-amber-950/40 border-amber-500' : 'bg-[#121215] border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <span className="text-[10px] font-mono uppercase text-amber-400 block mb-1">Retroactive Discoveries</span>
            <div className="text-2xl font-bold font-mono text-amber-300">{diffData.summary.retroactive_evidence_count}</div>
            <div className="text-[11px] text-zinc-400 mt-1">Past events revealed later</div>
          </div>
        </div>
      )}

      {/* Diff Details Content */}
      {diffData && (
        <div className="space-y-6">
          {/* Section: Revised / Refuted Claims (Critical for historical truth) */}
          {(activeTab === 'all' || activeTab === 'claims') && diffData.revised_claims.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-mono uppercase tracking-wider text-rose-400 flex items-center space-x-2">
                <AlertOctagon className="w-4 h-4" />
                <span>Revised, Refuted, and Newly Asserted Claims ({diffData.revised_claims.length})</span>
              </h3>

              <div className="space-y-3">
                {diffData.revised_claims.map((claim, idx) => (
                  <div key={idx} className="bg-[#121215] border border-zinc-800 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                          claim.diff_type === 'refuted_or_superseded'
                            ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                            : 'bg-sky-950/80 text-sky-400 border-sky-800'
                        }`}>
                          {claim.diff_type.replace(/_/g, ' ')}
                        </span>
                        <span className="font-semibold text-white text-xs">
                          {claim.subject_name || 'Subject'} {claim.predicate} {claim.object_name || 'Object'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] font-mono">
                        <span className="text-zinc-500">Status at A: <strong className="text-zinc-300">{claim.status_at_a || 'unasserted'}</strong></span>
                        <span>&rarr;</span>
                        <span className="text-rose-400">Status at B: <strong className="text-rose-300">{claim.status_at_b}</strong></span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-300 font-mono bg-[#16161a] p-2.5 rounded border-l-2 border-rose-500">
                      "{claim.claim_text}"
                    </p>

                    {claim.revision_reason && (
                      <div className="text-[11px] text-amber-300/90 font-mono flex items-start space-x-1.5">
                        <span className="font-semibold text-amber-400">Forensic Revision Note:</span>
                        <span>{claim.revision_reason}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Retroactively Discovered Evidence */}
          {(activeTab === 'all' || activeTab === 'retroactive') && diffData.retroactively_discovered_evidence.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-mono uppercase tracking-wider text-amber-400 flex items-center space-x-2">
                <History className="w-4 h-4" />
                <span>Retroactively Discovered Evidence (Reports revealing past events) ({diffData.retroactively_discovered_evidence.length})</span>
              </h3>

              <div className="space-y-3">
                {diffData.retroactively_discovered_evidence.map((retro, idx) => (
                  <div key={idx} className="bg-[#121215] border border-amber-900/40 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-200">{retro.document_title}</span>
                      <div className="flex items-center space-x-2 font-mono text-[11px]">
                        <span className="badge-tpub">Disclosed: {retro.publication_time.slice(0, 10)}</span>
                        <span className="badge-tevt">Occurred: {retro.event_time.slice(0, 10)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-300 font-mono bg-[#16161a] p-2.5 rounded border-l-2 border-amber-500">
                      "{retro.passage_text}"
                    </div>
                    <p className="text-[11px] text-amber-300 font-mono">{retro.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Changed Relationships */}
          {(activeTab === 'all' || activeTab === 'relationships') && diffData.changed_relationships.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-mono uppercase tracking-wider text-sky-400 flex items-center space-x-2">
                <ArrowRight className="w-4 h-4" />
                <span>Emerged & Changed Relationship Ties ({diffData.changed_relationships.length})</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {diffData.changed_relationships.map((rel, idx) => (
                  <div key={idx} className="bg-[#121215] border border-zinc-800 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{rel.source_name}</span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                        {rel.relation_type}
                      </span>
                      <span className="font-semibold text-white">{rel.target_name}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-800/60">
                      <span>Diff: <strong className="text-emerald-400">+{rel.new_evidence_count} corroborating reports</strong></span>
                      <span>Confidence: {Math.round(rel.confidence_at_b * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
