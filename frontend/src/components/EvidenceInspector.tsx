import React, { useState } from 'react';
import { X, ExternalLink, ShieldCheck, AlertTriangle, Clock, Bookmark, CheckCircle2, FileText, ArrowRight } from 'lucide-react';
import { SearchResultItem, RelationshipEvidence, WorkspaceDetail } from '../types';
import { api } from '../services/api';

interface EvidenceInspectorProps {
  item: SearchResultItem | null;
  evidenceItem?: RelationshipEvidence | null;
  onClose: () => void;
  workspaces: WorkspaceDetail[];
  activeWorkspaceId: string;
  onItemPinned?: () => void;
}

export const EvidenceInspector: React.FC<EvidenceInspectorProps> = ({
  item,
  evidenceItem,
  onClose,
  workspaces,
  activeWorkspaceId,
  onItemPinned
}) => {
  const [analystNote, setAnalystNote] = useState('');
  const [stance, setStance] = useState<'supports_hypothesis' | 'refutes_hypothesis' | 'neutral'>('supports_hypothesis');
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
      const targetId = item ? item.id : (evidenceItem?.id || 'ev_item');
      const itemType = item ? item.type : 'passage';
      await api.addWorkspaceItem(activeWorkspaceId, {
        item_type: itemType,
        item_id: targetId,
        analyst_note: analystNote,
        hypothesis_stance: stance
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
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-[#121215] border-l border-zinc-800 shadow-2xl z-50 flex flex-col transform transition-transform duration-200">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-[#16161a]">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-sky-400" />
          <span className="text-xs font-mono tracking-wider uppercase text-zinc-400">Evidence Inspector</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Title & Type */}
        <div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
              {item ? item.type : 'Evidence Excerpt'}
            </span>
            {status && (
              <span className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded border ${
                status === 'verified_fact' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' :
                status === 'refuted_or_superseded' ? 'bg-rose-950/60 text-rose-400 border-rose-800/60 line-through' :
                status === 'source_reported' ? 'bg-sky-950/60 text-sky-400 border-sky-800/60' :
                'bg-amber-950/60 text-amber-400 border-amber-800/60'
              }`}>
                {status.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <h2 className="text-lg font-medium text-white leading-snug">{title}</h2>
          <div className="text-xs text-zinc-400 mt-1 flex items-center space-x-2">
            <span>Source: <strong className="text-zinc-200">{sourceName}</strong></span>
          </div>
        </div>

        {/* 4-Timestamp Intelligence Box */}
        <div className="bg-[#18181c] border border-zinc-800/80 rounded-lg p-3.5 space-y-2.5">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Temporal Coordinates (4-Timestamp Model)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800/60">
              <span className="text-[10px] uppercase font-mono text-sky-400 block mb-0.5">Publication Time (T_pub)</span>
              <span className="font-mono text-zinc-200 text-xs">{pubTime ? pubTime.replace('T', ' ').slice(0, 19) : 'Undated'}</span>
            </div>
            <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800/60">
              <span className="text-[10px] uppercase font-mono text-emerald-400 block mb-0.5">Event Occurrence (T_event)</span>
              <span className="font-mono text-zinc-200 text-xs">{eventTime ? eventTime.replace('T', ' ').slice(0, 19) : 'Retroactive / Unspecified'}</span>
            </div>
            <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800/60">
              <span className="text-[10px] uppercase font-mono text-amber-400 block mb-0.5">Observation Time (T_obs)</span>
              <span className="font-mono text-zinc-200 text-xs">{obsTime ? obsTime.replace('T', ' ').slice(0, 19) : 'Prior telemetry'}</span>
            </div>
            <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800/60">
              <span className="text-[10px] uppercase font-mono text-zinc-400 block mb-0.5">Ingestion Time (T_ingest)</span>
              <span className="font-mono text-zinc-400 text-xs">Indexed in HistoryFather</span>
            </div>
          </div>
        </div>

        {/* Verbatim Evidence Passage */}
        <div className="space-y-1.5">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">Verbatim Passage Excerpt</div>
          <div className="bg-[#16161a] border-l-2 border-sky-500 p-3.5 text-sm leading-relaxed text-zinc-200 rounded-r font-mono whitespace-pre-wrap select-text">
            "{snippet}"
          </div>
        </div>

        {/* Confidence & Explainability */}
        <div className="bg-[#18181c] border border-zinc-800/80 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono uppercase text-zinc-400">Confidence Calibration</span>
            <span className="font-mono text-sky-400 font-semibold">{Math.round(confidence * 100)}%</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${confidence >= 0.9 ? 'bg-emerald-500' : confidence >= 0.7 ? 'bg-sky-500' : 'bg-amber-500'}`}
              style={{ width: `${Math.round(confidence * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-400 leading-normal">
            Score weighted by primary technical source tier, absence of circular wire replication, and corroboration by official forensic advisories.
          </p>
        </div>

        {/* Pin to Workspace / Hypothesis Ledger */}
        <div className="bg-[#18181c] border border-zinc-800 rounded-lg p-3.5 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-300 flex items-center space-x-1.5">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Pin to Investigation Dossier</span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400">Hypothesis Stance</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setStance('supports_hypothesis')}
                className={`py-1.5 px-2 text-xs rounded border transition-colors ${
                  stance === 'supports_hypothesis'
                    ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 font-medium'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Supports
              </button>
              <button
                type="button"
                onClick={() => setStance('refutes_hypothesis')}
                className={`py-1.5 px-2 text-xs rounded border transition-colors ${
                  stance === 'refutes_hypothesis'
                    ? 'bg-rose-950/80 border-rose-600 text-rose-300 font-medium'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Refutes
              </button>
              <button
                type="button"
                onClick={() => setStance('neutral')}
                className={`py-1.5 px-2 text-xs rounded border transition-colors ${
                  stance === 'neutral'
                    ? 'bg-zinc-800 border-zinc-600 text-zinc-200 font-medium'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Neutral
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400">Analyst Assessment / Note</label>
            <textarea
              value={analystNote}
              onChange={(e) => setAnalystNote(e.target.value)}
              placeholder="e.g., Critical corroboration linking SVR to token-forging infrastructure..."
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded p-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500 resize-none h-16"
            />
          </div>

          <button
            onClick={handlePin}
            disabled={pinning || !activeWorkspaceId}
            className="w-full py-2 bg-sky-600 hover:bg-sky-500 disabled:bg-zinc-800 text-white font-medium text-xs rounded flex items-center justify-center space-x-1.5 transition-colors"
          >
            {pinSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Pinned to Dossier</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                <span>{pinning ? 'Pinning...' : 'Add Evidence to Active Case'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
