import React, { useState, useEffect, useRef } from 'react';
import {
  Share2, ZoomIn, ZoomOut, RotateCcw, Filter, Calendar,
  Shield, AlertCircle, ArrowRight, Eye, Network, CheckCircle2, X,
  Activity, SlidersHorizontal, Sparkles, Waypoints, ExternalLink
} from 'lucide-react';
import { GraphResponse, GraphNode, GraphEdge, RelationshipEvidence } from '../types';
import { api } from '../services/api';

interface RelationshipGraphViewProps {
  onInspectEvidence: (evidence: RelationshipEvidence) => void;
}

export const RelationshipGraphView: React.FC<RelationshipGraphViewProps> = ({ onInspectEvidence }) => {
  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [edgeEvidence, setEdgeEvidence] = useState<RelationshipEvidence[]>([]);
  const [edgeModalOpen, setEdgeModalOpen] = useState(false);
  const [asOfYear, setAsOfYear] = useState<number>(2024);
  const [hops, setHops] = useState<number>(2);
  const [sourceEntityId, setSourceEntityId] = useState<string>('');
  const [targetEntityId, setTargetEntityId] = useState<string>('');
  const [pathResult, setPathResult] = useState<any[]>([]);
  const [metricMode, setMetricMode] = useState<'degree' | 'betweenness' | 'uniform'>('betweenness');
  const [relationFilter, setRelationFilter] = useState<string>('');

  // Canvas / SVG Layout state
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const asOfStr = asOfYear < 2024 ? `${asOfYear}-12-31T23:59:59Z` : undefined;
      const data = await api.getGraph({
        as_of_time: asOfStr,
        entity_id: selectedNode ? selectedNode.id : undefined,
        hops: hops
      });
      setGraphData(data);

      // Initialize structured radial topology layout
      const width = 800;
      const height = 550;
      const newPos: Record<string, { x: number; y: number }> = {};
      const total = data.nodes.length;
      
      // Sort nodes by centrality to place highest centrality in the core
      const sorted = [...data.nodes].sort((a, b) => (b.degree || 0) - (a.degree || 0));
      
      sorted.forEach((node, i) => {
        if (i === 0 && total > 3) {
          // Central hub at direct center
          newPos[node.id] = { x: width / 2, y: height / 2 };
        } else {
          const angle = (i / Math.max(total - 1, 1)) * 2 * Math.PI;
          const radius = i < 5 ? 170 : 250;
          newPos[node.id] = {
            x: width / 2 + radius * Math.cos(angle),
            y: height / 2 + radius * Math.sin(angle)
          };
        }
      });
      setPositions(newPos);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [asOfYear, hops]);

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
  };

  const handleEdgeClick = async (edge: GraphEdge) => {
    setSelectedEdge(edge);
    try {
      const ev = await api.getEdgeEvidence(edge.id);
      setEdgeEvidence(ev);
      setEdgeModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFindPath = async () => {
    if (!sourceEntityId || !targetEntityId) return;
    try {
      const path = await api.findPath(sourceEntityId, targetEntityId);
      setPathResult(path);
    } catch (e) {
      console.error(e);
    }
  };

  // Node radius calculation based on NetworkX metrics
  const getNodeRadius = (node: GraphNode) => {
    if (metricMode === 'uniform') return 14;
    if (metricMode === 'betweenness') {
      const b = node.betweenness || 0;
      return 12 + Math.min(20, b * 40);
    }
    // degree mode
    return 11 + Math.min(18, (node.degree || 1) * 2.5);
  };

  const filteredEdges = (graphData?.edges || []).filter(e => {
    if (relationFilter && e.relation_type !== relationFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Precision Controls Header Bar */}
      <div className="tactical-panel p-3.5 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Temporal Time-Scrubber */}
        <div className="flex items-center space-x-2.5">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <span className="uppercase text-zinc-400 text-[11px]">HORIZON:</span>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="2010"
              max="2024"
              value={asOfYear}
              onChange={(e) => setAsOfYear(Number(e.target.value))}
              className="w-28 h-1.5 bg-zinc-800 appearance-none cursor-pointer accent-white"
            />
            <span className="text-white font-bold text-xs">{asOfYear}</span>
          </div>
          <span className="text-[10px] text-zinc-500">
            {asOfYear === 2024 ? '[ALL RECORDED TIES]' : `[KNOWN BY ${asOfYear}]`}
          </span>
        </div>

        {/* Centrality Sizing Toggle */}
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] text-zinc-500 uppercase">METRIC SIZING:</span>
          {[
            { id: 'betweenness', label: 'Betweenness' },
            { id: 'degree', label: 'Degree' },
            { id: 'uniform', label: 'Uniform' }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMetricMode(m.id as any)}
              className={`px-2 py-0.5 border text-[10px] uppercase transition-colors ${
                metricMode === m.id
                  ? 'bg-white text-black border-white font-semibold'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* View Zoom & Reset Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setZoom(z => Math.min(z + 0.15, 2.0))}
            className="p-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(z - 0.15, 0.5))}
            className="p-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setSelectedNode(null); fetchGraph(); }}
            className="p-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300"
            title="Reset Graph Layout"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Secondary Bar: Pathfinder & Edge Filter */}
      <div className="tactical-panel p-2.5 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Shortest Path Finder */}
        <div className="flex items-center space-x-2">
          <Waypoints className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-500 text-[10px] uppercase tracking-wider">PATHFINDER:</span>
          <select
            value={sourceEntityId}
            onChange={(e) => setSourceEntityId(e.target.value)}
            className="bg-[#0c0c0e] border border-zinc-800 text-zinc-200 text-xs px-2 py-1 focus:outline-none"
          >
            <option value="">Select Entity A</option>
            {graphData?.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
          </select>
          <span className="text-zinc-600">&rarr;</span>
          <select
            value={targetEntityId}
            onChange={(e) => setTargetEntityId(e.target.value)}
            className="bg-[#0c0c0e] border border-zinc-800 text-zinc-200 text-xs px-2 py-1 focus:outline-none"
          >
            <option value="">Select Entity B</option>
            {graphData?.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
          </select>
          <button
            onClick={handleFindPath}
            disabled={!sourceEntityId || !targetEntityId}
            className="px-2.5 py-1 bg-white hover:bg-zinc-200 disabled:bg-zinc-900 disabled:text-zinc-600 text-black font-semibold text-[11px] transition-colors"
          >
            TRACE PATH
          </button>
        </div>

        {/* Edge Vector Type Filter */}
        <div className="flex items-center space-x-1.5 text-[10px]">
          <span className="text-zinc-500 uppercase">VECTOR:</span>
          {['', 'TARGETS', 'DEPLOYS', 'ATTRIBUTED_TO', 'EXPLOITS'].map((rel) => (
            <button
              key={rel}
              onClick={() => setRelationFilter(rel)}
              className={`px-1.5 py-0.5 border uppercase transition-colors ${
                relationFilter === rel
                  ? 'bg-white text-black border-white font-semibold'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              {rel || 'ALL'}
            </button>
          ))}
        </div>
      </div>

      {/* Discovered Multi-Hop Path Banner */}
      {pathResult.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-700 p-2.5 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <span className="text-white font-bold uppercase tracking-wider text-[10px] bg-black px-1.5 py-0.5 border border-zinc-700">
              SHORTEST ATTRIBUTION CHAIN:
            </span>
            {pathResult.map((p, idx) => (
              <span key={idx} className="flex items-center space-x-1.5 text-zinc-200">
                <span className="font-semibold text-white">{p.from_node}</span>
                <span className="text-[10px] px-1 py-0.2 bg-black border border-zinc-700 text-zinc-400">
                  {p.relation_type}
                </span>
                <span className="text-zinc-500">&rarr;</span>
                {idx === pathResult.length - 1 && <span className="font-semibold text-white">{p.to_node}</span>}
              </span>
            ))}
          </div>
          <button
            onClick={() => setPathResult([])}
            className="text-zinc-400 hover:text-white ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Graph Canvas Area */}
      <div className="relative bg-[#09090b] border border-zinc-800 h-[620px] flex overflow-hidden">
        {/* SVG Force Layout */}
        <div className="flex-1 h-full relative cursor-crosshair">
          <svg
            ref={svgRef}
            className="w-full h-full"
            viewBox="0 0 800 550"
            style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: 'center' }}
          >
            {/* Tactical Grid Overlay */}
            <defs>
              <pattern id="tacticalGridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
                <circle cx="0" cy="0" r="1.5" fill="rgba(255, 255, 255, 0.12)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tacticalGridPattern)" />

            {/* Edge Lines */}
            {filteredEdges.map((edge) => {
              const src = positions[edge.source];
              const tgt = positions[edge.target];
              if (!src || !tgt) return null;

              const isEdgeSelected = selectedEdge?.id === edge.id;
              const isPathEdge = pathResult.some(
                p => (p.from_node === edge.source && p.to_node === edge.target) ||
                     (p.to_node === edge.source && p.from_node === edge.target)
              );

              return (
                <g key={edge.id} className="cursor-pointer" onClick={() => handleEdgeClick(edge)}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={isPathEdge ? '#ffffff' : isEdgeSelected ? '#ffffff' : '#27272a'}
                    strokeWidth={isPathEdge ? 2.5 : isEdgeSelected ? 2 : 1.2}
                    strokeDasharray={edge.is_contested ? '3 3' : undefined}
                  />

                  {/* Edge Midpoint Label Badge */}
                  <g transform={`translate(${(src.x + tgt.x) / 2}, ${(src.y + tgt.y) / 2})`}>
                    <rect
                      x="-34"
                      y="-8"
                      width="68"
                      height="16"
                      fill="#000000"
                      stroke={isPathEdge || isEdgeSelected ? '#ffffff' : '#27272a'}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="3.5"
                      fill={isPathEdge || isEdgeSelected ? '#ffffff' : '#71717a'}
                      fontFamily="monospace"
                      fontSize="7.5"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {edge.relation_type}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Node Elements */}
            {graphData?.nodes.map((node) => {
              const pos = positions[node.id];
              if (!pos) return null;

              const isSelected = selectedNode?.id === node.id;
              const radius = getNodeRadius(node);

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer"
                  onClick={() => handleNodeClick(node)}
                >
                  {/* Outer selection ring */}
                  {isSelected && (
                    <circle
                      cx="0"
                      cy="0"
                      r={radius + 6}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Core Node Circle */}
                  <circle
                    cx="0"
                    cy="0"
                    r={radius}
                    fill="#0e0e12"
                    stroke={isSelected ? '#ffffff' : '#52525b'}
                    strokeWidth={isSelected ? 2 : 1.2}
                  />

                  {/* Inner Node Core */}
                  <circle
                    cx="0"
                    cy="0"
                    r="3.5"
                    fill={isSelected ? '#ffffff' : '#a1a1aa'}
                  />

                  {/* Node Label */}
                  <text
                    x="0"
                    y={radius + 14}
                    fill={isSelected ? '#ffffff' : '#d4d4d8'}
                    fontFamily="monospace"
                    fontSize="10"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {node.label}
                  </text>
                  <text
                    x="0"
                    y={radius + 24}
                    fill="#52525b"
                    fontFamily="monospace"
                    fontSize="7.5"
                    textAnchor="middle"
                  >
                    {node.entity_type?.toUpperCase()}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Node Inspector Drawer */}
        {selectedNode && (
          <div className="w-80 bg-[#0c0c0e] border-l border-zinc-800 p-4 overflow-y-auto space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Entity Telemetry</span>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="text-white font-bold text-sm">{selectedNode.label}</div>
              <div className="text-[10px] text-zinc-400 uppercase mt-0.5">{selectedNode.entity_type}</div>
            </div>

            {/* Network Centrality Scores */}
            <div className="space-y-2 border-t border-zinc-800 pt-3">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Network Centrality Metrics</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="tactical-panel p-2 border border-zinc-800">
                  <div className="text-zinc-500 text-[9px]">DEGREE</div>
                  <div className="text-white font-bold text-sm mt-0.5">{selectedNode.degree || 0}</div>
                </div>
                <div className="tactical-panel p-2 border border-zinc-800">
                  <div className="text-zinc-500 text-[9px]">BETWEENNESS</div>
                  <div className="text-white font-bold text-sm mt-0.5">{(selectedNode.betweenness || 0).toFixed(3)}</div>
                </div>
              </div>
            </div>

            {/* Entity Actions */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-800">
              <button
                onClick={() => {
                  setSourceEntityId(selectedNode.id);
                }}
                className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-center text-xs block transition-colors"
              >
                Set as Pathfinder Source A
              </button>
              <button
                onClick={() => {
                  setTargetEntityId(selectedNode.id);
                }}
                className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-center text-xs block transition-colors"
              >
                Set as Pathfinder Target B
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edge Verbatim Evidence Modal */}
      {edgeModalOpen && selectedEdge && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="tactical-panel w-full max-w-2xl border border-zinc-700 p-5 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-white" />
                <span className="font-bold text-white text-sm">Verifiable Provenance Excerpts</span>
              </div>
              <button
                onClick={() => setEdgeModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 bg-black p-3 border border-zinc-800">
              <div className="text-zinc-400 text-[11px]">
                RELATIONSHIP: <span className="text-white font-bold">{selectedEdge.source} &rarr; {selectedEdge.relation_type} &rarr; {selectedEdge.target}</span>
              </div>
              <div className="text-zinc-500 text-[10px]">
                STATUS: {selectedEdge.status.toUpperCase()} | CONFIDENCE: {Math.round(selectedEdge.confidence * 100)}%
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {edgeEvidence.length === 0 ? (
                <div className="text-zinc-500 text-center py-4">
                  No primary passage excerpts directly indexed for this edge.
                </div>
              ) : (
                edgeEvidence.map((ev, idx) => (
                  <div key={idx} className="tactical-card p-3 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] border-b border-zinc-900 pb-1.5">
                      <span className="text-white font-semibold">{ev.source_name}</span>
                      <span className="badge-tpub">T_pub: {ev.publication_time.slice(0, 10)}</span>
                    </div>
                    <div className="text-zinc-300 font-sans italic text-xs leading-relaxed bg-black/40 p-2.5 border-l-2 border-white">
                      "{ev.verbatim_quote}"
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <div>REPORT: {ev.document_title}</div>
                      <div>CONF: {Math.round(ev.confidence_score * 100)}%</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setEdgeModalOpen(false)}
                className="px-4 py-1.5 bg-white text-black hover:bg-zinc-200 font-semibold text-xs"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
