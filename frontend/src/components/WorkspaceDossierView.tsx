import React, { useState, useEffect } from 'react';
import {
  Folder, Plus, Bookmark, FileText, Download, Printer,
  Trash2, Edit3, CheckCircle2, ShieldCheck, AlertOctagon, HelpCircle
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
        analyst_name: 'Lead Temporal Analyst'
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
  const neutralItems = workspace?.items.filter(i => i.hypothesis_stance === 'neutral') || [];

  return (
    <div className="space-y-6">
      {/* Workspace Selector & Case Meta */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Folder className="w-5 h-5 text-amber-400" />
            <div>
              <div className="flex items-center space-x-2">
                <select
                  value={activeWorkspaceId}
                  onChange={(e) => onSelectWorkspace(e.target.value)}
                  className="bg-[#18181c] border border-zinc-700 rounded px-3 py-1 text-sm font-semibold text-white focus:outline-none"
                >
                  {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.title}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded border border-zinc-700 font-mono flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Case</span>
                </button>
              </div>
            </div>
          </div>

          {/* Export Actions Bar */}
          {workspace && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => downloadFile(`/api/workspaces/${workspace.id}/export/markdown`, `dossier_${workspace.id}.md`)}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-zinc-200 flex items-center space-x-1.5 transition-colors"
                title="Download Executive Markdown Report"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Export Markdown</span>
              </button>

              <button
                onClick={() => window.open(`/api/workspaces/${workspace.id}/export/html`, '_blank')}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-zinc-200 flex items-center space-x-1.5 transition-colors"
                title="View Print-Ready HTML Dossier"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Printable HTML</span>
              </button>

              <button
                onClick={() => downloadFile(`/api/workspaces/${workspace.id}/export/json`, `dossier_${workspace.id}.json`)}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-zinc-200 flex items-center space-x-1.5 transition-colors"
                title="Export Structured JSON"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>JSON Dossier</span>
              </button>
            </div>
          )}
        </div>

        {workspace && (
          <div className="pt-2 border-t border-zinc-800/80 text-xs space-y-1">
            <p className="text-zinc-300 leading-relaxed">{workspace.description || 'No description provided.'}</p>
            <div className="flex items-center space-x-4 text-[11px] font-mono text-zinc-500 pt-1">
              <span>Lead Analyst: <strong className="text-zinc-400">{workspace.analyst_name}</strong></span>
              <span>Case ID: <code>{workspace.id}</code></span>
              <span>Pinned Items: {workspace.items.length}</span>
              <span>Working Notes: {workspace.notes.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Hypothesis Ledger: Supporting vs Contradictory Evidence */}
      {workspace && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Supporting Evidence Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Supporting Evidence ({supportingItems.length})</span>
              </h3>
            </div>

            <div className="space-y-3">
              {supportingItems.length === 0 ? (
                <div className="p-6 bg-[#121215] border border-dashed border-zinc-800 rounded-lg text-center text-xs text-zinc-500 font-mono">
                  No evidence pinned to 'Supports' yet. Use the Evidence Inspector on any search result or timeline milestone to pin.
                </div>
              ) : (
                supportingItems.map((item) => (
                  <div key={item.id} className="bg-[#121215] border border-zinc-800 rounded-lg p-3.5 space-y-2 group">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {item.item_type}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-xs font-semibold text-white">
                      {item.details?.canonical_name || item.details?.title || item.details?.claim_text || item.item_id}
                    </div>

                    {item.details?.text && (
                      <div className="text-[11px] text-zinc-300 font-mono bg-[#16161a] p-2 rounded border-l-2 border-emerald-500">
                        "{item.details.text}"
                      </div>
                    )}

                    {item.analyst_note && (
                      <div className="text-[11px] text-emerald-300/90 font-mono bg-emerald-950/30 p-2 rounded">
                        <strong>Analyst Note:</strong> {item.analyst_note}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Contradictory / Refuting Evidence Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono uppercase tracking-wider text-rose-400 flex items-center space-x-1.5">
                <AlertOctagon className="w-4 h-4" />
                <span>Contradictory / Refuting Evidence ({refutingItems.length})</span>
              </h3>
            </div>

            <div className="space-y-3">
              {refutingItems.length === 0 ? (
                <div className="p-6 bg-[#121215] border border-dashed border-zinc-800 rounded-lg text-center text-xs text-zinc-500 font-mono">
                  No contradictory claims recorded. Contradictory or superseded evidence pinned here isolates conflicting hypotheses.
                </div>
              ) : (
                refutingItems.map((item) => (
                  <div key={item.id} className="bg-[#121215] border border-rose-900/40 rounded-lg p-3.5 space-y-2 group">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                        {item.item_type} (Contradiction)
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-zinc-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-xs font-semibold text-white">
                      {item.details?.canonical_name || item.details?.title || item.details?.claim_text || item.item_id}
                    </div>

                    {item.details?.contradiction_reason && (
                      <div className="text-[11px] text-rose-300 font-mono bg-rose-950/40 p-2 rounded">
                        <strong>Contradiction Rationale:</strong> {item.details.contradiction_reason}
                      </div>
                    )}

                    {item.analyst_note && (
                      <div className="text-[11px] text-zinc-300 font-mono bg-[#16161a] p-2 rounded">
                        <strong>Analyst Note:</strong> {item.analyst_note}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analyst Working Notes Section */}
      {workspace && (
        <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h3 className="text-sm font-mono uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
              <Edit3 className="w-4 h-4 text-sky-400" />
              <span>Analyst Working Notes & Hypotheses ({workspace.notes.length})</span>
            </h3>
            <button
              onClick={() => setShowAddNote(true)}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded border border-zinc-700 font-mono flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Note</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspace.notes.map((note) => (
              <div key={note.id} className="bg-[#18181c] border border-zinc-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-white font-mono">{note.title}</h4>
                  <span className="text-[10px] text-zinc-500 font-mono">{note.updated_at.slice(0, 10)}</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Create Workspace */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-white">Create Investigation Dossier</h3>
            <form onSubmit={handleCreateWorkspace} className="space-y-3">
              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">Case Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Operation Sandworm SCADA Sabotage"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">Executive Scope / Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Chronological investigation into..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-zinc-100 focus:outline-none h-20 resize-none"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs rounded font-medium"
                >
                  Create Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Note */}
      {showAddNote && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-white">Add Working Analyst Note</h3>
            <form onSubmit={handleAddNote} className="space-y-3">
              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">Note Title</label>
                <input
                  type="text"
                  required
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="e.g., Assessment of DGA Infrastructure"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-1">Content</label>
                <textarea
                  required
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Record observations, hypotheses, or contradictory leads..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-xs text-zinc-100 focus:outline-none h-28 resize-none font-mono"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddNote(false)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs rounded font-medium"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
