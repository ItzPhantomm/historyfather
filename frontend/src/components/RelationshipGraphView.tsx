import React, { useState, useEffect, useRef } from 'react';
import {
  Share2, ZoomIn, ZoomOut, RotateCcw, Filter, Calendar,
  Shield, AlertCircle, ArrowRight, Eye, Network, CheckCircle2, X
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

  // Canvas / SVG Layout state
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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

      // Initialize radial / circular positions
      const width = 800;
      const height = 550;
      const newPos: Record<string, { x: number; y: number }> = {};
      const total = data.nodes.length;
      data.nodes.forEach((node, i) => {
        const angle = (i / Math.max(total, 1)) * 2 * Math.PI;
        const radius = 220 + (i % 2 === 0 ? 30 : -30);
        newPos[node.id] = {
          x: width / 2 + radius * Math.cos(angle),
          y: height / 2 + radius * Math.sin(angle)
        };
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

  // Node color mapping
  const getNodeColor = (type?: string) => {
    switch (type) {
      case 'threat_actor': return '#f43f5e'; // Rose
      case 'malware': return '#f59e0b';      // Amber
      case 'organization': return '#38bdf8'; // Sky
      case 'infrastructure': return '#a855f7';// Purple
      case 'geopolitical_entity': return '#10b981'; // Emerald
      default: return '#71717a';
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Temporal Time-Scrubber */}
        <div className="flex items-center space-x-3 text-xs">
          <Calendar className="w-4 h-4 text-sky-400" />
          <span className="font-mono uppercase text-zinc-400">Scrub Time Horizon:</span>
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min="2010"
              max="2024"
              value={asOfYear}
              onChange={(e) => setAsOfYear(Number(e.target.value))}
              className="w-36 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <span className="font-mono text-amber-300 font-semibold text-sm w-12">{asOfYear}</span>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            {asOfYear === 2024 ? '(All Historical Ties)' : `(Connections known by ${asOfYear})`}
          </span>
        </div>

        {/* Pathfinder Drawer Trigger */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-zinc-400 font-mono text-[11px]">Pathfinder:</span>
          <select
            value={sourceEntityId}
            onChange={(e) => setSourceEntityId(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 font-mono focus:outline-none"
          >
            <option value="">Select Entity A</option>
            {graphData?.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
          </select>
          <span className="text-zinc-600">&rarr;</span>
          <select
            value={targetEntityId}
            onChange={(e) => setTargetEntityId(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2 py-1 font-mono focus:outline-none"
          >
            <option value="">Select Entity B</option>
            {graphData?.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
          </select>
          <button
            onClick={handleFindPath}
            disabled={!sourceEntityId || !targetEntityId}
            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 disabled:bg-zinc-800 text-white rounded text-xs font-mono transition-colors"
          >
            Trace Connection
          </button>
        </div>

        {/* View Controls */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setZoom(z => Math.min(z + 0.15, 2.0))}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-300"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(z - 0.15, 0.5))}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setSelectedNode(null); fetchGraph(); }}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-300"
            title="Reset Graph"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Connection Path Overlay */}
      {pathResult.length > 0 && (
        <div className="bg-sky-950/40 border border-sky-800/80 rounded-lg p-3 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-mono uppercase text-sky-400 font-semibold">Discovered Path:</span>
            {pathResult.map((p, idx) => (
              <span key={idx} className="flex items-center space-x-1.5 text-zinc-200 font-mono">
                <span>{p.from_node}</span>
                <span className="text-zinc-500 font-sans text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                  {p.relation_type}
                </span>
                <span>&rarr;</span>
                {idx === pathResult.length - 1 && <span>{p.to_node}</span>}
              </span>
            ))}
          </div>
          <button
            onClick={() => setPathResult([])}
            className="text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Graph Canvas Area */}
      <div className="relative bg-[#0d0d10] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl h-[620px] flex">
        {/* SVG Force Layout */}
        <div className="flex-1 h-full relative cursor-grab active:cursor-grabbing">
          <svg
            ref={svgRef}
            className="w-full h-full"
            viewBox="0 0 800 550"
            style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`, transformOrigin: 'center' }}
          >
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#52525b" />
              </marker>
              <marker
                id="arrow-active"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
              </marker>
            </defs>

            {/* Edges */}
            {graphData?.edges.map((edge) => {
              const srcPos = positions[edge.source];
              const tgtPos = positions[edge.target];
              if (!srcPos || !tgtPos) return null;

              const isEdgeSelected = selectedEdge?.id === edge.id;
              const midX = (srcPos.x + tgtPos.x) / 2;
              const midY = (srcPos.y + tgtPos.y) / 2;

              return (
                <g key={edge.id} className="cursor-pointer group" onClick={() => handleEdgeClick(edge)}>
                  <line
                    x1={srcPos.x}
                    y1={srcPos.y}
                    x2={tgtPos.x}
                    y2={tgtPos.y}
                    stroke={isEdgeSelected ? '#38bdf8' : '#27272a'}
                    strokeWidth={isEdgeSelected ? 3 : 1.5}
                    markerEnd={isEdgeSelected ? 'url(#arrow-active)' : 'url(#arrow)'}
                    className="group-hover:stroke-sky-400 group-hover:stroke-[2.5] transition-all"
                  />
                  <rect
                    x={midX - 35}
                    y={midY - 10}
                    width={70}
                    height={20}
                    fill="#18181b"
                    rx={4}
                    stroke={isEdgeSelected ? '#38bdf8' : '#3f3f46'}
                    strokeWidth={1}
                  />
                  <text
                    x={midX}
                    y={midY + 4}
                    textAnchor="middle"
                    fill={isEdgeSelected ? '#38bdf8' : '#a1a1aa'}
                    fontSize="9px"
                    fontFamily="monospace"
                    className="select-none pointer-events-none"
                  >
                    {edge.relation_type.slice(0, 11)}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {graphData?.nodes.map((node) => {
              const pos = positions[node.id] || { x: 400, y: 275 };
              const isSelected = selectedNode?.id === node.id;
              const nodeColor = getNodeColor(node.entity_type);

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer group select-none"
                  onClick={() => handleNodeClick(node)}
                >
                  <circle
                    r={isSelected ? 20 : 15}
                    fill="#121215"
                    stroke={nodeColor}
                    strokeWidth={isSelected ? 3 : 1.8}
                    className="group-hover:scale-125 transition-transform"
                  />
                  <circle
                    r={isSelected ? 8 : 5}
                    fill={nodeColor}
                  />
                  <text
                    y={28}
                    textAnchor="middle"
                    fill={isSelected ? '#ffffff' : '#d4d4d8'}
                    fontSize="11px"
                    fontFamily="sans-serif"
                    fontWeight={isSelected ? 600 : 400}
                    className="drop-shadow-md pointer-events-none"
                  >
                    {node.label}
                  </text>
                  <text
                    y={40}
                    textAnchor="middle"
                    fill="#71717a"
                    fontSize="9px"
                    fontFamily="monospace"
                    className="pointer-events-none"
                  >
                    {node.entity_type?.replace(/_/g, ' ')}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend Overlay */}
          <div className="absolute bottom-4 left-4 bg-[#121215]/90 border border-zinc-800 rounded-lg p-3 text-xs space-y-1.5 backdrop-blur font-mono">
            <span className="text-[10px] uppercase text-zinc-500 block mb-1">Entity Classes</span>
            <div className="flex items-center space-x-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /><span>Threat Actor</span></div>
            <div className="flex items-center space-x-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span>Malware / Tool</span></div>
            <div className="flex items-center space-x-2"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /><span>Target / Org</span></div>
            <div className="flex items-center space-x-2"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /><span>Infrastructure</span></div>
            <div className="flex items-center space-x-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span>Geopolitical</span></div>
          </div>
        </div>

        {/* Selected Entity Inspector Side Panel */}
        {selectedNode && (
          <div className="w-80 bg-[#121215] border-l border-zinc-800 p-4 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-zinc-400">Node Focus</span>
              <button onClick={() => setSelectedNode(null)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {selectedNode.entity_type}
              </span>
              <h3 className="text-base font-semibold text-white mt-1.5">{selectedNode.label}</h3>
              <div className="text-xs text-zinc-400 font-mono mt-1">
                Degree Centrality: <strong className="text-sky-400">{selectedNode.degree} links</strong>
              </div>
            </div>

            <div className="bg-zinc-900 p-3 rounded border border-zinc-800 text-xs space-y-1.5 font-mono">
              <div className="text-zinc-400">First Observed: {selectedNode.first_seen?.slice(0, 10) || 'N/A'}</div>
              <div className="text-zinc-400">Attribution Confidence: {Math.round(selectedNode.confidence * 100)}%</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono uppercase text-zinc-400">Ego Subgraph</div>
              <div className="flex space-x-2">
                {[1, 2, 3].map(h => (
                  <button
                    key={h}
                    onClick={() => setHops(h)}
                    className={`px-3 py-1 text-xs font-mono rounded border ${
                      hops === h ? 'bg-sky-950 text-sky-400 border-sky-800' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {h} Hop{h > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800">
              <button
                onClick={() => {
                  setSourceEntityId(selectedNode.id);
                }}
                className="w-full py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded font-mono"
              >
                Set as Pathfinder Origin
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Traceable Edge Evidence Modal */}
      {edgeModalOpen && selectedEdge && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-zinc-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center space-x-2">
                <Network className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-semibold text-white">
                  Traceable Edge Evidence: {selectedEdge.relation_type}
                </h3>
              </div>
              <button onClick={() => setEdgeModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-zinc-400 font-mono">
              Every connection in HistoryFather must be backed by verifiable passages. Below are the primary source citations establishing this edge:
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {edgeEvidence.map((ev) => (
                <div key={ev.id} className="bg-[#16161a] border border-zinc-800 rounded p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-200">{ev.source_name}</span>
                    <span className="font-mono text-sky-400 text-[11px]">{ev.publication_time.slice(0, 10)}</span>
                  </div>
                  <div className="text-xs text-zinc-300 font-mono bg-zinc-900 p-2.5 rounded border-l-2 border-sky-500">
                    "{ev.verbatim_quote}"
                  </div>
                  <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-500 font-mono">
                    <span>Document: {ev.document_title || 'Intelligence Advisory'}</span>
                    <button
                      onClick={() => {
                        setEdgeModalOpen(false);
                        onInspectEvidence(ev);
                      }}
                      className="text-sky-400 hover:underline"
                    >
                      Open Full Document
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
