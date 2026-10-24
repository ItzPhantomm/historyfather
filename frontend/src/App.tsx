import React, { useState, useEffect } from 'react';
import {
  Search, GitCompare, Share2, Radio, Folder, UploadCloud,
  Terminal, Shield, Clock, RefreshCw, X, ChevronRight,
  Database, Cpu, ArrowUpRight
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

const PRELOADED_CASES = [
  { id: 'apt29', title: 'APT29 / Midnight Blizzard', subtitle: 'SolarWinds Supply Chain & SVR Attribution', tab: 'search', query: 'APT29' },
  { id: 'notpetya', title: 'Sandworm Team / NotPetya', subtitle: 'Pseudo-Ransomware to Destructive Wiper Refutation', tab: 'diff', query: 'Sandworm' },
  { id: 'ronin', title: 'Lazarus Group / Ronin Bridge', subtitle: '$620M Validator Compromise & DPRK Attribution', tab: 'graph', query: 'Lazarus Group' },
  { id: 'pegasus', title: 'Pegasus Spyware / NSO Group', subtitle: 'Citizen Lab Forensics & Entity List Blacklist', tab: 'sources', query: 'Pegasus' },
  { id: 'stuxnet', title: 'Operation Olympic Games / Stuxnet', subtitle: 'Natanz IR-1 Centrifuge Frequency Sabotage', tab: 'search', query: 'Stuxnet' }
];

export function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'graph' | 'diff' | 'sources' | 'workspace' | 'ingest'>('search');
  const [inspectorItem, setInspectorItem] = useState<SearchResultItem | null>(null);
  const [inspectorEvidence, setInspectorEvidence] = useState<RelationshipEvidence | null>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [reseedLoading, setReseedLoading] = useState(false);

  // Command Palette State
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');

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

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Command Palette on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
        return;
      }

      // Close on Escape
      if (e.key === 'Escape') {
        setIsCommandOpen(false);
        return;
      }

      // Tab switcher numbers 1-6 (only if not typing in input/textarea)
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (!isInput && !isCommandOpen) {
        if (e.key === '1') setActiveTab('search');
        if (e.key === '2') setActiveTab('graph');
        if (e.key === '3') setActiveTab('diff');
        if (e.key === '4') setActiveTab('sources');
        if (e.key === '5') setActiveTab('workspace');
        if (e.key === '6') setActiveTab('ingest');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandOpen]);

  const handleReseed = async () => {
    if (!confirm('Re-initialize database with verified forensic intelligence cases (SolarWinds, NotPetya, Ronin Bridge, Pegasus, Stuxnet)?')) return;
    setReseedLoading(true);
    try {
      await api.reseed();
      await refreshSystemData();
      alert('Database verified and synchronized.');
    } catch (e: any) {
      alert(`Reseed failed: ${e.message}`);
    } finally {
      setReseedLoading(false);
    }
  };

  const filteredCases = PRELOADED_CASES.filter(c =>
    c.title.toLowerCase().includes(commandSearch.toLowerCase()) ||
    c.subtitle.toLowerCase().includes(commandSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-200 flex flex-col font-sans selection:bg-white selection:text-black">
      {/* Precision Tactical Header Bar */}
      <header className="bg-[#09090b] border-b border-zinc-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo & Operational Callout */}
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 bg-white text-black flex items-center justify-center font-mono font-black text-xs tracking-tighter">
              HF
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="font-bold text-sm tracking-tight text-white font-mono uppercase">
                HistoryFather
              </span>
              <span className="text-[10px] font-mono text-zinc-500 tracking-wider">
                // TEMPORAL WORKSTATION
              </span>
            </div>
          </div>

          {/* Quick Telemetry Counters */}
          <div className="hidden md:flex items-center space-x-4 text-[11px] font-mono text-zinc-400">
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-white rounded-none" />
              <span className="text-zinc-500">SYS:</span>
              <span className="text-zinc-200 font-semibold">NOMINAL</span>
            </div>
            <span className="text-zinc-700">|</span>
            <div>
              <span className="text-zinc-500">REPORTS:</span> <span className="text-white font-semibold">{metrics.documents_count || 0}</span>
            </div>
            <span className="text-zinc-700">|</span>
            <div>
              <span className="text-zinc-500">ENTITIES:</span> <span className="text-white font-semibold">{metrics.entities_count || 0}</span>
            </div>
            <span className="text-zinc-700">|</span>
            <div>
              <span className="text-zinc-500">MILESTONES:</span> <span className="text-white font-semibold">{metrics.events_count || 0}</span>
            </div>
            <span className="text-zinc-700">|</span>
            <div>
              <span className="text-zinc-500">CLAIMS:</span> <span className="text-white font-semibold">{metrics.claims_count || 0}</span>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center space-x-2.5">
            {/* Quick Command Trigger */}
            <button
              onClick={() => setIsCommandOpen(true)}
              className="flex items-center space-x-2 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 hover:text-white font-mono text-xs transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Jump / Case</span>
              <kbd className="px-1 py-0.2 bg-black border border-zinc-700 text-[10px] text-zinc-400 font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Reseed Data Action */}
            <button
              onClick={handleReseed}
              disabled={reseedLoading}
              title="Reset Database to Pristine Historical Cases"
              className="px-2.5 py-1 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-mono text-xs flex items-center space-x-1.5 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${reseedLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          </div>
        </div>

        {/* Monochromatic Segmented Workspace Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center space-x-1 overflow-x-auto py-1 border-t border-zinc-800/80 bg-[#060608]">
          {[
            { id: 'search', key: '1', label: 'Timeline & Search', icon: Search },
            { id: 'graph', key: '2', label: 'Topological Graph', icon: Share2 },
            { id: 'diff', key: '3', label: 'Snapshot Diff', icon: GitCompare },
            { id: 'sources', key: '4', label: 'Source Lineage', icon: Radio },
            { id: 'workspace', key: '5', label: 'Case Dossiers', icon: Folder },
            { id: 'ingest', key: '6', label: 'Ingestion Hub', icon: UploadCloud }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-mono tracking-wide transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-transparent text-zinc-400 border-transparent hover:text-zinc-100 hover:border-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1 py-0.2 ${isActive ? 'bg-zinc-200 text-black' : 'text-zinc-600'}`}>
                  [{tab.key}]
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Investigation Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 bg-tactical-grid">
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

      {/* Command Palette Modal (⌘K) */}
      {isCommandOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-100">
          <div className="w-full max-w-2xl bg-[#0e0e12] border border-zinc-700 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Search Header */}
            <div className="p-3 border-b border-zinc-800 flex items-center space-x-2">
              <Search className="w-4 h-4 text-zinc-400" />
              <input
                type="text"
                autoFocus
                placeholder="Jump to intelligence case, entity, or module..."
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-zinc-500 font-mono"
              />
              <button
                onClick={() => setIsCommandOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions List */}
            <div className="p-2 max-h-96 overflow-y-auto divide-y divide-zinc-900 font-mono text-xs">
              <div className="py-1 px-2 text-[10px] text-zinc-500 tracking-wider uppercase">
                Preloaded Historical Intelligence Cases
              </div>
              {filteredCases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveTab(c.tab as any);
                    setIsCommandOpen(false);
                  }}
                  className="w-full text-left p-2.5 hover:bg-zinc-900/80 flex items-center justify-between group transition-colors"
                >
                  <div>
                    <div className="text-zinc-100 font-semibold flex items-center space-x-2">
                      <span>{c.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 text-zinc-400 border border-zinc-700 uppercase">
                        {c.tab}
                      </span>
                    </div>
                    <div className="text-zinc-400 text-[11px] mt-0.5">{c.subtitle}</div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                </button>
              ))}

              <div className="py-1 px-2 text-[10px] text-zinc-500 tracking-wider uppercase mt-2">
                Workstation Navigation Modules
              </div>
              {[
                { id: 'search', label: 'Timeline & Search Engine', desc: 'Point-in-time forensic reconstruction' },
                { id: 'graph', label: 'Topological Graph Visualizer', desc: 'Betweenness centrality & attribution' },
                { id: 'diff', label: 'Historical Snapshot Diff', desc: 'Detect changed claims & new evidence' },
                { id: 'sources', label: 'Source Lineage & Anti-Circularity', desc: 'SimHash near-duplicate clustering' },
                { id: 'workspace', label: 'Case Dossiers & STIX 2.1 Export', desc: 'Hypothesis ledger with SHA-256 seal' },
                { id: 'ingest', label: 'Document Ingestion Adapter', desc: 'Automatic passage chunking & FTS5 indexing' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveTab(m.id as any);
                    setIsCommandOpen(false);
                  }}
                  className="w-full text-left p-2.5 hover:bg-zinc-900/80 flex items-center justify-between group transition-colors"
                >
                  <div>
                    <div className="text-zinc-200 font-semibold">{m.label}</div>
                    <div className="text-zinc-500 text-[11px] mt-0.5">{m.desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>

            {/* Modal Footer Key Hints */}
            <div className="p-2 border-t border-zinc-800 bg-black/60 flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <div className="flex items-center space-x-3">
                <span>[ESC] Close</span>
                <span>[↑↓] Select</span>
                <span>[ENTER] Execute</span>
              </div>
              <div>HISTORYFATHER v1.4 // VERIFIED PROVENANCE</div>
            </div>
          </div>
        </div>
      )}

      {/* Global Evidence Inspector Drawer */}
      <EvidenceInspector
        item={inspectorItem}
        evidenceItem={inspectorEvidence}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onItemPinned={refreshSystemData}
        onClose={() => {
          setInspectorItem(null);
          setInspectorEvidence(null);
        }}
      />

      {/* Modern Tactical Telemetry Footer */}
      <footer className="bg-[#09090b] border-t border-zinc-800 text-[11px] font-mono text-zinc-500 py-3 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-3">
            <span className="text-zinc-300 font-semibold">HISTORYFATHER</span>
            <span>&bull;</span>
            <span>4-TIMESTAMP TEMPORAL MODEL (T_pub, T_event, T_obs, T_ingest)</span>
            <span>&bull;</span>
            <span className="text-zinc-400">SQLITE FTS5 // WAL</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>[1-6] View Hotkeys</span>
            <span>[⌘K] Command Jump</span>
            <span className="text-zinc-300">STIX 2.1 COMPLIANT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
