import React, { useState } from 'react';
import { X, ExternalLink, ShieldCheck, AlertTriangle, Clock, Bookmark, CheckCircle2, FileText, ArrowRight } from 'lucide-react';
import { SearchResultItem, RelationshipEvidence } from '../types';
import { api } from '../services/api';

interface EvidenceInspectorProps {
  item: SearchResultItem | null;
  evidenceItem?: RelationshipEvidence | null;
  onClose: () => void;
  workspaces?: any[];
  activeWorkspaceId?: string;
  onItemPinned?: () => void;
}

export const EvidenceInspector: React.FC<EvidenceInspectorProps> = ({
  item,
  evidenceItem,
  onClose,
  workspaces = [],
  activeWorkspaceId = '',
  onItemPinned
}) => {
  const [analystNote, setAnalystNote] = useState('');
  const [stance, setStance] = useState<'supports' | 'refutes'>('supports');
  const [pinSuccess, setPinSuccess] = useState(false);
  const [pinning, setPinning] = useState(false);

  if (!item && !evidenceItem) return null;

  const title = item ? item.title : (evidenceItem?.document_title || 'Traceable Edge Evidence');
  const snippet = item ? item.snippet : (evidenceItem?.verbatim_quote || '');
  const sourceName = item ? item.source_name : (evidenceItem?.source_name || 'Primary Report');
  const pubTime = item ? item.publication_time : (evidenceItem?.publication_time || '');
  const eventTime = item?.event_time;
  const obsTime = item?.observation_time;
  const status = item?.claim_status;
  const confidence = item ? item.confidence : (evidenceItem?.confidence_score || 0.95);

  const handlePin = async () => {
    if (!activeWorkspaceId) return;
    setPinning(true);
    try {
      const targetId = item ? item.id : (evidenceItem?.relationship_id || 'ev_item');
      const itemType = item ? item.type : 'passage';
      await api.addWorkspaceItem(activeWorkspaceId, {
        item_type: itemType,
        item_id: targetId,
        analyst_note: analystNote,
        hypothesis_stance: stance === 'supports' ? 'supports_hypothesis' : 'refutes_hypothesis'
      });
      setPinSuccess(true);
      if (onItemPinned) onItemPinned();
      setTimeout(() => setPinSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setPinning(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-[#09090b] border-l border-zinc-800 shadow-2xl z-50 flex flex-col font-mono text-xs">
      {/* Header */}
      <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between bg-[#0c0c0e]">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-white" />
          <span className="text-xs font-bold tracking-wider uppercase text-white">Evidence Inspector</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Title & Epistemic Type */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase px-1.5 py-0.2 bg-zinc-900 border border-zinc-700 text-zinc-300">
              {item ? item.type : 'Evidence Excerpt'}
            </span>
            {status && (
              <span className={status === 'verified_fact' ? 'badge-fact' : status === 'refuted_or_superseded' ? 'badge-refuted' : 'badge-reported'}>
                {status.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <h2 className="text-sm font-bold text-white font-sans leading-snug pt-1">{title}</h2>
          <div className="text-[11px] text-zinc-400 pt-0.5">
            PRIMARY SOURCE: <strong className="text-white">{sourceName}</strong>
          </div>
        </div>

        {/* 4-Timestamp Intelligence Box */}
        <div className="tactical-panel p-3 border border-zinc-800 space-y-2">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-bold text-white">Temporal Coordinates (4-Timestamp Model)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-black p-2 border border-zinc-800">
              <span className="text-[9px] uppercase text-zinc-500 block mb-0.5">Publication Time (T_pub)</span>
              <span className="text-zinc-200 font-semibold">{pubTime ? pubTime.replace('T', ' ').slice(0, 19) : 'Undated'}</span>
            </div>
            <div className="bg-black p-2 border border-zinc-800">
              <span className="text-[9px] uppercase text-zinc-500 block mb-0.5">Event Incident (T_event)</span>
              <span className="text-white font-bold">{eventTime ? eventTime.replace('T', ' ').slice(0, 19) : 'Retroactive / Unspecified'}</span>
            </div>
            <div className="bg-black p-2 border border-zinc-800">
              <span className="text-[9px] uppercase text-zinc-500 block mb-0.5">Observation Time (T_obs)</span>
              <span className="text-zinc-400">{obsTime ? obsTime.replace('T', ' ').slice(0, 19) : 'Sensor Telemetry'}</span>
            </div>
            <div className="bg-black p-2 border border-zinc-800">
              <span className="text-[9px] uppercase text-zinc-500 block mb-0.5">Ingestion Time (T_ingest)</span>
              <span className="text-zinc-500">Indexed in HistoryFather</span>
            </div>
          </div>
        </div>

        {/* Verbatim Passage Excerpt */}
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">Verbatim Passage Excerpt</div>
          <div className="bg-black border-l-2 border-white p-3 text-xs leading-relaxed text-zinc-200 font-sans whitespace-pre-wrap select-text">
            "{snippet}"
          </div>
        </div>

        {/* Confidence Calibration */}
        <div className="tactical-panel p-3 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="uppercase text-zinc-400">Confidence Calibration</span>
            <span className="text-white font-bold">{Math.round(confidence * 100)}%</span>
          </div>
          <div className="w-full bg-zinc-900 h-1.5 border border-zinc-800">
            <div
              className="h-full bg-white"
              style={{ width: `${Math.round(confidence * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-500 font-sans leading-normal">
            Score calibrated against primary technical advisories, IOC cryptographic validation, and absence of circular syndicated reprint loops.
          </p>
        </div>

        {/* Pin to Workspace / Hypothesis Ledger */}
        <div className="tactical-panel p-3.5 border border-zinc-800 space-y-3">
          <div className="text-[11px] uppercase tracking-wider text-white font-bold flex items-center space-x-1.5">
            <Bookmark className="w-3.5 h-3.5 text-white" />
            <span>Pin to Active Case Workspace</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase text-zinc-500 block">Hypothesis Stance</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setStance('supports')}
                className={`py-1 px-2 border text-center transition-colors ${
                  stance === 'supports'
                    ? 'bg-white text-black border-white font-bold'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                Supports Hypothesis
              </button>
              <button
                type="button"
                onClick={() => setStance('refutes')}
                className={`py-1 px-2 border text-center transition-colors ${
                  stance === 'refutes'
                    ? 'bg-zinc-800 text-white border-zinc-600 font-bold'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                Refutes / Contradicts
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-zinc-500 block">Analyst Deduction Note</label>
            <input
              type="text"
              placeholder="e.g. Corroborates external C2 domain tie..."
              value={analystNote}
              onChange={(e) => setAnalystNote(e.target.value)}
              className="w-full bg-black border border-zinc-800 text-white px-2.5 py-1.5 text-xs font-mono focus:border-white focus:outline-none"
            />
          </div>

          <button
            onClick={handlePin}
            disabled={pinning || !activeWorkspaceId}
            className="w-full py-2 bg-white text-black hover:bg-zinc-200 font-bold uppercase tracking-wider text-xs transition-colors disabled:bg-zinc-800 disabled:text-zinc-600"
          >
            {pinSuccess ? 'EVIDENCE RECORD PINNED ✓' : pinning ? 'RECORDING PIN...' : 'PIN EVIDENCE RECORD'}
          </button>
        </div>
      </div>
    </div>
  );
};
