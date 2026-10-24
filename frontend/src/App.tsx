import React, { useState, useEffect } from 'react';
import {
  Search, GitCompare, Share2, Radio, Folder, UploadCloud,
  Shield, Activity, RefreshCw, Clock, Layers, Sparkles
} from 'lucide-react';
import { SearchResultItem, RelationshipEvidence, WorkspaceDetail } from './types';
import { api } from './services/api';

import { SearchTimelineView } from './components/SearchTimelineView';
import { RelationshipGraphView } from './components/RelationshipGraphView';
import { TemporalDiffView } from './components/TemporalDiffView';
import { SourceIntelligenceView } from './components/SourceIntelligenceView';
import { WorkspaceDossierView } from './components/WorkspaceDossierView';
import { IngestionHubView } from './components/IngestionHubView';
import { EvidenceInspector } from './components/EvidenceInspector';

export function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'graph' | 'diff' | 'sources' | 'workspace' | 'ingest'>('search');
  const [inspectorItem, setInspectorItem] = useState<SearchResultItem | null>(null);
  const [inspectorEvidence, setInspectorEvidence] = useState<RelationshipEvidence | null>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [reseedLoading, setReseedLoading] = useState(false);

  const refreshSystemData = async () => {
    try {
      const statusRes = await api.getStatus();
      setMetrics(statusRes.metrics);
      const wsList = await api.getWorkspaces();
      setWorkspaces(wsList);
      if (wsList.length > 0 && !activeWorkspaceId) {
        setActiveWorkspaceId(wsList[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshSystemData();
  }, []);

  const handleReseed = async () => {
    if (!confirm('Reset database to pristine historical cases (SolarWinds, NotPetya, Ronin Bridge, Pegasus, Stuxnet)?')) return;
    setReseedLoading(true);
    try {
      await api.reseed();
      await refreshSystemData();
      alert('Database successfully re-seeded with 5 verified intelligence cases!');
    } catch (e: any) {
      alert(`Reseed failed: ${e.message}`);
    } finally {
      setReseedLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top Intelligence Console Bar */}
      <header className="bg-[#121215] border-b border-zinc-800/90 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold tracking-tight text-white font-mono text-sm">HISTORYFATHER</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  v1.0.0
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono tracking-wider block">
                TEMPORAL INTELLIGENCE SEARCH ENGINE
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="hidden lg:flex items-center space-x-5 text-xs font-mono text-zinc-400">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{metrics.documents_count || 0} Reports</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-zinc-600">&bull;</span>
              <span>{metrics.entities_count || 0} Entities</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-zinc-600">&bull;</span>
              <span>{metrics.events_count || 0} Milestones</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-zinc-600">&bull;</span>
              <span>{metrics.claims_count || 0} Claims</span>
            </div>
          </div>

          {/* Reseed & Active Case Button */}
          <div className="flex items-center space-x-3 text-xs">
            <button
              onClick={handleReseed}
              disabled={reseedLoading}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-400 hover:text-zinc-200 font-mono text-[11px] flex items-center space-x-1 transition-colors"
              title="Reset Database to Pristine Historical Cases"
            >
              <RefreshCw className={`w-3 h-3 ${reseedLoading ? 'animate-spin' : ''}`} />
              <span>Reseed Data</span>
            </button>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center space-x-1 overflow-x-auto py-1">
          {[
            { id: 'search', label: 'Search & Timelines', icon: Search },
            { id: 'graph', label: 'Relationship Graph', icon: Share2 },
            { id: 'diff', label: 'Temporal Comparison', icon: GitCompare },
            { id: 'sources', label: 'Source Intelligence', icon: Radio },
            { id: 'workspace', label: 'Case Dossiers', icon: Folder },
            { id: 'ingest', label: 'Ingestion Hub', icon: UploadCloud }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-mono tracking-wide rounded-t transition-all whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'border-sky-500 text-sky-400 bg-sky-950/20 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Investigation Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'search' && (
          <SearchTimelineView
            onSelectEvidence={(item) => {
              setInspectorEvidence(null);
              setInspectorItem(item);
            }}
          />
        )}

        {activeTab === 'graph' && (
          <RelationshipGraphView
            onInspectEvidence={(ev) => {
              setInspectorItem(null);
              setInspectorEvidence(ev);
            }}
          />
        )}

        {activeTab === 'diff' && <TemporalDiffView />}

        {activeTab === 'sources' && <SourceIntelligenceView />}

        {activeTab === 'workspace' && (
          <WorkspaceDossierView
            activeWorkspaceId={activeWorkspaceId}
            onSelectWorkspace={(id) => setActiveWorkspaceId(id)}
            workspaces={workspaces}
            onRefreshWorkspaces={refreshSystemData}
          />
        )}

        {activeTab === 'ingest' && (
          <IngestionHubView onIngestSuccess={refreshSystemData} />
        )}
      </main>

      {/* Global Evidence Inspector Drawer */}
      <EvidenceInspector
        item={inspectorItem}
        evidenceItem={inspectorEvidence}
        onClose={() => {
          setInspectorItem(null);
          setInspectorEvidence(null);
        }}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onItemPinned={refreshSystemData}
      />

      {/* Footer */}
      <footer className="bg-[#121215] border-t border-zinc-800/80 py-3 text-center text-xs font-mono text-zinc-500">
        HistoryFather // Temporal Intelligence Search Engine &bull; What was known then? What changed? What supports that conclusion?
      </footer>
    </div>
  );
}
