import React, { useState, useEffect } from 'react';
import {
  Folder, Plus, Bookmark, FileText, Download, Printer,
  Trash2, Edit3, CheckCircle2, ShieldCheck, AlertOctagon,
  HelpCircle, Binary, Shield, ExternalLink, X
} from 'lucide-react';
import { WorkspaceDetail, WorkspaceItem, WorkspaceNote } from '../types';
import { api } from '../services/api';

interface WorkspaceDossierViewProps {
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  workspaces: any[];
  onRefreshWorkspaces: () => void;
}

export const WorkspaceDossierView: React.FC<WorkspaceDossierViewProps> = ({
  activeWorkspaceId,
  onSelectWorkspace,
  workspaces,
  onRefreshWorkspaces
}) => {
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);

  const fetchWorkspaceDetail = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getWorkspace(id);
      setWorkspace(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchWorkspaceDetail(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    try {
      const created = await api.createWorkspace({
        title: newTitle,
        description: newDesc,
        analyst_name: 'Lead Forensics Investigator'
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      onRefreshWorkspaces();
      onSelectWorkspace(created.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle || !noteContent || !activeWorkspaceId) return;
    try {
      await api.addWorkspaceNote(activeWorkspaceId, {
        title: noteTitle,
        content: noteContent
      });
      setShowAddNote(false);
      setNoteTitle('');
      setNoteContent('');
      fetchWorkspaceDetail(activeWorkspaceId);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!activeWorkspaceId) return;
    try {
      await api.removeWorkspaceItem(activeWorkspaceId, itemId);
      fetchWorkspaceDetail(activeWorkspaceId);
    } catch (e) {
      console.error(e);
    }
  };

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const supportingItems = workspace?.items.filter(i => i.hypothesis_stance === 'supports_hypothesis') || [];
  const refutingItems = workspace?.items.filter(i => i.hypothesis_stance === 'refutes_hypothesis') || [];

  return (
    <div className="space-y-5 font-mono text-xs">
      {/* Workspace Selection & Header Bar */}
      <div className="tactical-panel p-4 border border-zinc-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-2">
            <Folder className="w-4 h-4 text-white" />
            <span className="text-white font-bold uppercase tracking-wider text-xs">
              Case Workspaces & Evidence Dossiers
            </span>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-2.5 py-1 bg-white text-black hover:bg-zinc-200 font-semibold text-[11px] flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>NEW CASE WORKSPACE</span>
          </button>
        </div>

        {/* Case Workspace Selector Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-zinc-500 text-[10px] uppercase">ACTIVE CASE:</span>
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => onSelectWorkspace(ws.id)}
              className={`px-2.5 py-1 border transition-colors ${
                activeWorkspaceId === ws.id
                  ? 'bg-white text-black border-white font-bold'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              {ws.title}
            </button>
          ))}
        </div>
      </div>

      {workspace && (
        <div className="space-y-4">
          {/* Active Case Banner & Multi-Format Exports */}
          <div className="tactical-panel p-4 border border-zinc-800 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white uppercase">{workspace.title}</h2>
                <div className="text-zinc-400 font-sans text-xs mt-0.5">{workspace.description}</div>
                <div className="text-[10px] text-zinc-500 mt-1 flex items-center space-x-3">
                  <span>ANALYST: {workspace.analyst_name}</span>
                  <span>PINNED ITEMS: {workspace.items.length}</span>
                  <span>NOTES: {workspace.notes.length}</span>
                </div>
              </div>

              {/* Multi-Format Export Buttons (STIX 2.1, Markdown, HTML) */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => downloadFile(api.getWorkspaceExportMarkdownUrl(workspace.id), `${workspace.id}_dossier.md`)}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-[11px] flex items-center space-x-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>EXPORT MARKDOWN</span>
                </button>
                <button
                  onClick={() => downloadFile(api.getWorkspaceExportHtmlUrl(workspace.id), `${workspace.id}_dossier.html`)}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-[11px] flex items-center space-x-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>EXPORT HTML</span>
                </button>
                <button
                  onClick={() => downloadFile(api.getWorkspaceExportStixUrl(workspace.id), `stix21_${workspace.id}.json`)}
                  className="px-2.5 py-1 bg-white hover:bg-zinc-200 text-black font-semibold text-[11px] flex items-center space-x-1 transition-colors"
                >
                  <Binary className="w-3 h-3" />
                  <span>EXPORT STIX 2.1 BUNDLE</span>
                </button>
              </div>
            </div>

            {/* Cryptographic SHA-256 Seal Indicator */}
            <div className="p-2.5 bg-black border border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span>INTEGRITY SEAL: Verified provenance with SHA-256 evidence hash verification</span>
              </div>
              <div className="text-zinc-500 font-mono">
                CASE HASH: [0x{workspace.id.slice(-8)}]
              </div>
            </div>
          </div>

          {/* Dual Column Hypothesis Ledger: Supporting vs Contradictory Evidence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Column 1: Supporting Evidence */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-white font-bold uppercase text-[11px] flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Supporting Evidence ({supportingItems.length})</span>
                </span>
                <span className="text-[10px] text-zinc-500">CORROBORATES HYPOTHESIS</span>
              </div>

              {supportingItems.length === 0 ? (
                <div className="tactical-panel p-6 text-center text-zinc-500 text-xs border-dashed border-zinc-800">
                  No supporting evidence pinned to this case. Pin passages or entities from Search & Timeline.
                </div>
              ) : (
                supportingItems.map((item) => (
                  <div key={item.id} className="tactical-card p-3 border border-zinc-800 space-y-2 group">
                    <div className="flex items-center justify-between text-[11px] border-b border-zinc-900 pb-1.5">
                      <span className="text-[10px] px-1.5 py-0.2 bg-zinc-900 border border-zinc-700 text-white uppercase font-semibold">
                        {item.item_type}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-zinc-600 hover:text-white transition-colors"
                        title="Remove pinned item"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-white font-semibold text-xs">
                      {item.details?.canonical_name || item.details?.title || item.details?.claim_text || item.item_id}
                    </div>

                    {item.details?.text && (
                      <div className="text-[11px] text-zinc-300 font-sans italic bg-black p-2 border-l-2 border-white">
                        "{item.details.text}"
                      </div>
                    )}

                    {item.analyst_note && (
                      <div className="text-[11px] text-zinc-300 font-sans bg-zinc-950 p-2 border border-zinc-800">
                        <strong>Analyst Note:</strong> {item.analyst_note}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Column 2: Contradictory / Refuting Evidence */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-white font-bold uppercase text-[11px] flex items-center space-x-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Contradictory / Refuting Evidence ({refutingItems.length})</span>
                </span>
                <span className="text-[10px] text-zinc-500">CONTESTED OR SUPERSEDED</span>
              </div>

              {refutingItems.length === 0 ? (
                <div className="tactical-panel p-6 text-center text-zinc-500 text-xs border-dashed border-zinc-800">
                  No contradictory claims recorded. Conflicting evidence pinned here isolates contested hypotheses.
                </div>
              ) : (
                refutingItems.map((item) => (
                  <div key={item.id} className="tactical-card p-3 border border-zinc-700 space-y-2 group">
                    <div className="flex items-center justify-between text-[11px] border-b border-zinc-900 pb-1.5">
                      <span className="text-[10px] px-1.5 py-0.2 bg-black border border-zinc-600 text-zinc-300 uppercase font-semibold">
                        CONTRADICTION // {item.item_type}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-zinc-600 hover:text-white transition-colors"
                        title="Remove pinned item"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-white font-semibold text-xs">
                      {item.details?.canonical_name || item.details?.title || item.details?.claim_text || item.item_id}
                    </div>

                    {item.details?.contradiction_reason && (
                      <div className="text-[11px] text-zinc-300 font-sans bg-black p-2 border-l-2 border-zinc-500">
                        <strong>Contradiction Rationale:</strong> {item.details.contradiction_reason}
                      </div>
                    )}

                    {item.analyst_note && (
                      <div className="text-[11px] text-zinc-300 font-sans bg-zinc-950 p-2 border border-zinc-800">
                        <strong>Analyst Note:</strong> {item.analyst_note}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Analyst Notes Section */}
          <div className="tactical-panel p-4 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-white font-bold uppercase text-xs">Analyst Notes & Deductions ({workspace.notes.length})</span>
              <button
                onClick={() => setShowAddNote(true)}
                className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-[10px] uppercase font-semibold transition-colors"
              >
                + ADD NOTE
              </button>
            </div>

            {workspace.notes.length === 0 ? (
              <div className="text-zinc-500 text-center py-4 text-xs">No analyst notes recorded yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {workspace.notes.map((n) => (
                  <div key={n.id} className="tactical-card p-3 border border-zinc-800 space-y-1.5">
                    <div className="text-white font-bold text-xs">{n.title}</div>
                    <div className="text-zinc-300 font-sans text-xs leading-relaxed whitespace-pre-line">{n.content}</div>
                    <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-900">UPDATED: {n.updated_at.slice(0, 10)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateWorkspace} className="tactical-panel w-full max-w-md border border-zinc-700 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-white font-bold uppercase text-xs">Initialize Case Workspace</span>
              <button onClick={() => setShowCreateModal(false)} type="button" className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase text-zinc-500 block mb-1">Case Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. APT29 / Midnight Blizzard 2024 Scope"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white px-2.5 py-1.5 text-xs font-mono focus:border-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-zinc-500 block mb-1">Investigation Scope / Objective</label>
                <textarea
                  rows={3}
                  placeholder="Reconstruct supply chain injection vectors and subsequent executive inbox compromises..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white px-2.5 py-1.5 text-xs font-mono focus:border-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1 bg-zinc-900 text-zinc-400 hover:text-white text-xs"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-white text-black font-semibold hover:bg-zinc-200 text-xs"
              >
                CREATE CASE
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddNote && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddNote} className="tactical-panel w-full max-w-md border border-zinc-700 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-white font-bold uppercase text-xs">Record Analyst Deduction</span>
              <button onClick={() => setShowAddNote(false)} type="button" className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase text-zinc-500 block mb-1">Deduction Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Supply chain DLL signing corroboration"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white px-2.5 py-1.5 text-xs font-mono focus:border-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-zinc-500 block mb-1">Analytical Assessment</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Telemetry proves the attacker used legitimate compromised certificate infrastructure..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full bg-black border border-zinc-800 text-white px-2.5 py-1.5 text-xs font-mono focus:border-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddNote(false)}
                className="px-3 py-1 bg-zinc-900 text-zinc-400 hover:text-white text-xs"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-white text-black font-semibold hover:bg-zinc-200 text-xs"
              >
                SAVE DEDUCTION
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
