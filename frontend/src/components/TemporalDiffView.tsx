import React, { useState, useEffect } from 'react';
import {
  GitCompare, Calendar, ArrowRight, ShieldCheck, AlertOctagon,
  Sparkles, History, HelpCircle, CheckCircle2, RefreshCw, AlertCircle
} from 'lucide-react';
import { TemporalDiffResponse } from '../types';
import { api } from '../services/api';

const DIFF_PRESETS = [
  {
    label: 'SolarWinds: Dec 2020 (FireEye Disclosure) → Apr 2021 (CISA SVR Attribution)',
    timeA: '2020-12-14T00:00:00Z',
    timeB: '2021-04-16T00:00:00Z',
    description: 'UNC2452 cluster resolved into Russian SVR / APT29 with formal CISA advisory AA21-008A.'
  },
  {
    label: 'NotPetya: Jun 2017 (Ransomware Claim) → Oct 2020 (US DOJ GRU Indictment)',
    timeA: '2017-06-28T00:00:00Z',
    timeB: '2020-10-20T00:00:00Z',
    description: 'Initial financial ransomware hypothesis refuted and established as destructive GRU military wiper.'
  },
  {
    label: 'Ronin Bridge: Mar 2022 (Compromise) → Apr 2022 (Lazarus DPRK Attribution)',
    timeA: '2022-03-30T00:00:00Z',
    timeB: '2022-04-15T00:00:00Z',
    description: 'Attribution of the $620M validator key drain to DPRK Lazarus Group.'
  },
  {
    label: 'Full Corpus Horizon: 2010 (Stuxnet) → 2024 (Present Day)',
    timeA: '2010-12-31T00:00:00Z',
    timeB: '2024-12-31T23:59:59Z',
    description: 'Complete 14-year longitudinal evolution across all five intelligence cases.'
  }
];

export const TemporalDiffView: React.FC = () => {
  const [snapshotA, setSnapshotA] = useState<string>('2020-12-14T00:00:00Z');
  const [snapshotB, setSnapshotB] = useState<string>('2021-04-16T00:00:00Z');
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

  const handleApplyPreset = (preset: typeof DIFF_PRESETS[0]) => {
    setSnapshotA(preset.timeA);
    setSnapshotB(preset.timeB);
    executeDiff(preset.timeA, preset.timeB);
  };

  return (
    <div className="space-y-5">
      {/* Header & Date Configuration */}
      <div className="tactical-panel p-4 border border-zinc-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-2">
            <GitCompare className="w-4 h-4 text-white" />
            <h2 className="text-xs font-mono font-bold text-white tracking-wider uppercase">
              Temporal Snapshot Comparison ("Diff Engine")
            </h2>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            ISOLATING KNOWLEDGE EVOLUTION & RETROACTIVE EVIDENCE BETWEEN T1 AND T2
          </span>
        </div>

        {/* Date Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 font-mono text-xs">
          <div className="bg-[#0c0c0e] p-3 border border-zinc-800 space-y-1.5">
            <label className="text-[10px] uppercase text-zinc-500 flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-zinc-400" />
              <span>Snapshot A (Baseline Knowledge State T1)</span>
            </label>
            <input
              type="text"
              value={snapshotA}
              onChange={(e) => setSnapshotA(e.target.value)}
              className="w-full bg-black border border-zinc-800 text-white px-2.5 py-1.5 text-xs font-mono focus:border-white focus:outline-none"
            />
          </div>

          <div className="bg-[#0c0c0e] p-3 border border-zinc-800 space-y-1.5">
            <label className="text-[10px] uppercase text-zinc-500 flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-zinc-400" />
              <span>Snapshot B (Subsequent Knowledge State T2)</span>
            </label>
            <input
              type="text"
              value={snapshotB}
              onChange={(e) => setSnapshotB(e.target.value)}
              className="w-full bg-black border border-zinc-800 text-white px-2.5 py-1.5 text-xs font-mono focus:border-white focus:outline-none"
            />
          </div>
        </div>

        {/* Diff Action & Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-800 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-zinc-500 text-[10px] uppercase">PRESETS:</span>
            {DIFF_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="px-2 py-0.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] transition-colors"
              >
                Case {idx + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => executeDiff(snapshotA, snapshotB)}
            disabled={loading}
            className="px-3.5 py-1.5 bg-white text-black hover:bg-zinc-200 text-xs font-semibold tracking-wider transition-colors disabled:bg-zinc-800 disabled:text-zinc-600"
          >
            {loading ? 'COMPUTING DIFF...' : 'CALCULATE SNAPSHOT DIFF'}
          </button>
        </div>
      </div>

      {/* Diff Metrics Bar */}
      {diffData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="tactical-panel p-3 border border-zinc-800">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider">[+] NEW ENTITIES</div>
            <div className="text-white font-bold text-lg mt-0.5">+{diffData.newly_observed_entities.length}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Disclosed between T1 and T2</div>
          </div>

          <div className="tactical-panel p-3 border border-zinc-800">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider">[Δ] ALTERED RELATIONSHIPS</div>
            <div className="text-white font-bold text-lg mt-0.5">+{diffData.changed_relationships.length}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">New attribution vectors</div>
          </div>

          <div className="tactical-panel p-3 border border-zinc-800">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider">[✕] REFUTED / REVISED CLAIMS</div>
            <div className="text-white font-bold text-lg mt-0.5">{diffData.revised_claims.length}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Retracted / debunked facts</div>
          </div>

          <div className="tactical-panel p-3 border border-zinc-800">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wider">[*] RETROACTIVE DISCOVERIES</div>
            <div className="text-white font-bold text-lg mt-0.5">+{diffData.retroactively_discovered_evidence.length}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Published post-T1 on prior events</div>
          </div>
        </div>
      )}

      {/* Diff Tabs & Items Stream */}
      <div className="space-y-3 font-mono text-xs">
        <div className="flex items-center space-x-1 border-b border-zinc-800 pb-2">
          {[
            { id: 'all', label: 'All Diff Changes' },
            { id: 'entities', label: `New Entities (${diffData?.newly_observed_entities.length || 0})` },
            { id: 'relationships', label: `Altered Ties (${diffData?.changed_relationships.length || 0})` },
            { id: 'claims', label: `Refuted Claims (${diffData?.revised_claims.length || 0})` },
            { id: 'retroactive', label: `Retroactive Evidence (${diffData?.retroactively_discovered_evidence.length || 0})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 text-xs transition-colors border ${
                activeTab === tab.id
                  ? 'bg-white text-black border-white font-semibold'
                  : 'bg-transparent text-zinc-400 border-transparent hover:text-white hover:border-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Changes List */}
        {loading ? (
          <div className="tactical-panel p-10 text-center text-zinc-500 text-xs">
            [ RUNNING HISTORICAL SNAPSHOT DIFFERENCING ALGORITHM... ]
          </div>
        ) : !diffData ? (
          <div className="tactical-panel p-8 text-center text-zinc-500 text-xs">
            Select two snapshot dates above and click Calculate Snapshot Diff.
          </div>
        ) : (
          <div className="space-y-3">
            {/* 1. Newly Observed Entities */}
            {(activeTab === 'all' || activeTab === 'entities') && diffData.newly_observed_entities.map((e, idx) => (
              <div key={e.id || idx} className="tactical-card p-3 border border-zinc-800">
                <div className="flex items-center justify-between text-xs border-b border-zinc-900 pb-1.5 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-1.5 py-0.2 bg-white text-black font-bold uppercase">
                      + NEW ENTITY
                    </span>
                    <span className="text-white font-bold">{e.canonical_name || e.name || e.id}</span>
                  </div>
                  <span className="text-zinc-500 text-[10px]">OBSERVED: {e.first_observed_time?.slice(0, 10) || 'Between T1 and T2'}</span>
                </div>
                <div className="text-zinc-400 text-xs font-sans">{e.summary || e.description}</div>
                <div className="text-[10px] text-zinc-500 mt-2">TYPE: {(e.entity_type || 'entity').toUpperCase()}</div>
              </div>
            ))}

            {/* 2. Altered / New Relationships */}
            {(activeTab === 'all' || activeTab === 'relationships') && diffData.changed_relationships.map((r, idx) => (
              <div key={idx} className="tactical-card p-3 border border-zinc-800">
                <div className="flex items-center justify-between text-xs border-b border-zinc-900 pb-1.5 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 text-zinc-200 border border-zinc-600 font-bold uppercase">
                      &Delta; {r.diff_type.toUpperCase()}
                    </span>
                    <span className="text-white font-bold">{r.source_name} &rarr; {r.relation_type} &rarr; {r.target_name}</span>
                  </div>
                  <span className="badge-tpub">Status: {r.status_at_b.toUpperCase()}</span>
                </div>
                <div className="text-[11px] text-zinc-300 font-sans italic bg-black p-2 border-l-2 border-white">
                  Evidence count: {r.new_evidence_count} primary passages supporting new tie.
                </div>
                <div className="text-[10px] text-zinc-500 mt-2 flex justify-between">
                  <span>RELATIONSHIP ID: {r.relationship_id}</span>
                  <span>CONFIDENCE AT T2: {Math.round((r.confidence_at_b || 1.0) * 100)}%</span>
                </div>
              </div>
            ))}

            {/* 3. Refuted / Revised Claims */}
            {(activeTab === 'all' || activeTab === 'claims') && diffData.revised_claims.map((c, idx) => (
              <div key={idx} className="tactical-card p-3.5 border border-zinc-800">
                <div className="flex items-center justify-between text-xs border-b border-zinc-900 pb-1.5 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="badge-refuted">
                      {c.diff_type.toUpperCase()}
                    </span>
                    <span className="text-zinc-400 font-semibold">{c.subject_name || 'Claim Subject'}</span>
                  </div>
                  <span className="text-zinc-500 text-[10px]">PREDICATE: {c.predicate}</span>
                </div>

                <div className="space-y-2">
                  <div className="text-zinc-400 text-xs font-sans bg-black/60 p-2 border-l border-zinc-800">
                    "{c.claim_text}"
                  </div>
                  {c.revision_reason && (
                    <div className="text-[11px] text-white flex items-center space-x-1.5">
                      <span className="text-zinc-500 font-mono">&rarr; REVISION REASON:</span>
                      <span className="font-sans font-medium">{c.revision_reason}</span>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-zinc-500 mt-2 pt-1.5 border-t border-zinc-900 flex justify-between">
                  <span>STATUS AT T2: {c.status_at_b.toUpperCase()}</span>
                  <span>CERTAINTY: {c.certainty_at_b.toUpperCase()}</span>
                </div>
              </div>
            ))}

            {/* 4. Retroactive Evidence */}
            {(activeTab === 'all' || activeTab === 'retroactive') && diffData.retroactively_discovered_evidence.map((ev, idx) => (
              <div key={idx} className="tactical-card p-3 border border-zinc-800">
                <div className="flex items-center justify-between text-xs border-b border-zinc-900 pb-1.5 mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-1.5 py-0.2 bg-zinc-950 text-zinc-400 border border-zinc-800 uppercase">
                      RETROACTIVE
                    </span>
                    <span className="text-white font-semibold">{ev.document_title}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px]">
                    <span className="badge-tevt">Event: {ev.event_time?.slice(0, 10)}</span>
                    <span className="badge-tpub">Disclosed: {ev.publication_time.slice(0, 10)}</span>
                  </div>
                </div>
                <div className="text-zinc-300 text-xs font-sans italic bg-black p-2 border-l border-zinc-700">
                  "{ev.passage_text}"
                </div>
                <div className="text-[10px] text-zinc-500 mt-2">
                  EXPLANATION: {ev.explanation} (Source: {ev.source_name})
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
