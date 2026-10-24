import React, { useState, useEffect } from 'react';
import {
  Radio, AlertTriangle, ShieldCheck, FileText, CheckCircle2,
  ExternalLink, Copy, HelpCircle, Layers, ArrowRight, Binary,
  Fingerprint, AlertOctagon, Terminal
} from 'lucide-react';
import { SourceIntelligenceResponse } from '../types';
import { api } from '../services/api';

export const SourceIntelligenceView: React.FC = () => {
  const [data, setData] = useState<SourceIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeClusterIdx, setActiveClusterIdx] = useState<number>(0);

  useEffect(() => {
    const fetchSourceIntel = async () => {
      setLoading(true);
      try {
        const res = await api.getSourceIntelligence();
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSourceIntel();
  }, []);

  if (loading) {
    return (
      <div className="tactical-panel p-12 text-center text-zinc-500 font-mono text-xs border border-zinc-800">
        [ COMPUTING SIMHASH BIT DISTANCES & WIRE SYNDICATION CLUSTERS... ]
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* Header & Anti-Circularity Briefing */}
      <div className="tactical-panel p-4 border border-zinc-800 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-white" />
            <h2 className="text-xs font-bold text-white tracking-wider uppercase">
              Source Intelligence & Anti-Circularity Engine
            </h2>
          </div>
          <span className="text-[11px] text-zinc-500">
            {data.sources.length} SOURCES &bull; {data.syndication_clusters.length} SYNDICATION CLUSTERS
          </span>
        </div>

        <p className="text-zinc-400 font-sans text-xs leading-relaxed">
          HistoryFather detects content reuse and wire syndication using <strong>64-bit SimHash locality-sensitive fingerprinting</strong> and n-gram shingle Jaccard overlap. When secondary media outlets reprint identical paragraphs without providing new primary forensic telemetry, our engine explicitly flags the echo chamber to prevent artificial corroboration inflation.
        </p>

        {/* Circular Warnings Banner */}
        {data.circular_reporting_warnings.length > 0 && (
          <div className="space-y-2 pt-1">
            {data.circular_reporting_warnings.map((warn, idx) => (
              <div key={idx} className="p-3 bg-zinc-950 border border-zinc-700 text-xs font-mono space-y-1">
                <div className="flex items-center space-x-2 text-white font-semibold">
                  <AlertOctagon className="w-3.5 h-3.5 text-zinc-300" />
                  <span className="uppercase tracking-wider">CIRCULAR REPORTING ALERT // FALSE CORROBORATION DETECTED</span>
                </div>
                <div className="text-zinc-300 font-sans text-xs">{warn.warning}</div>
                <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-900 flex justify-between">
                  <span>PRIMARY: {warn.original_source} ({warn.original_time.slice(0, 10)})</span>
                  <span>ECHO OUTLET: {warn.echo_source} ({warn.echo_time.slice(0, 10)})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 64-bit SimHash Fingerprint Visualizer */}
      <div className="tactical-panel p-4 border border-zinc-800 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center space-x-2">
            <Fingerprint className="w-4 h-4 text-white" />
            <span className="text-white font-bold tracking-wider uppercase text-xs">
              64-Bit SimHash Fingerprint & Shingle Hamming Distance
            </span>
          </div>
          <span className="text-zinc-500 text-[10px]">LSH DEDUPLICATION ENGINE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="tactical-card p-3 border border-zinc-800 space-y-2">
            <div className="text-white font-semibold text-xs flex justify-between">
              <span>Primary Source: FireEye Advisory</span>
              <span className="badge-tpub">2020-12-13</span>
            </div>
            <div className="text-[10px] text-zinc-400">
              SIMHASH: <code className="text-white font-mono">0xb4f210a8e9321d4c</code>
            </div>
            <div className="bg-black p-2 font-mono text-[9px] text-zinc-300 tracking-widest break-all border border-zinc-800">
              10110100 11110010 00010000 10101000 11101001 00110010 00011101 01001100
            </div>
            <div className="text-[10px] text-zinc-500">
              Multi-order shingles: unigrams (92), bigrams (84), trigrams (76).
            </div>
          </div>

          <div className="tactical-card p-3 border border-zinc-800 space-y-2">
            <div className="text-white font-semibold text-xs flex justify-between">
              <span>Syndicated Reprint: Global Wire Syndicate</span>
              <span className="badge-tpub">2020-12-14</span>
            </div>
            <div className="text-[10px] text-zinc-400">
              SIMHASH: <code className="text-white font-mono">0xb4f210a8e9321d0e</code>
            </div>
            <div className="bg-black p-2 font-mono text-[9px] text-zinc-300 tracking-widest break-all border border-zinc-800">
              10110100 11110010 00010000 10101000 11101001 00110010 00011101 <span className="text-white font-bold underline">00001110</span>
            </div>
            <div className="text-[10px] text-zinc-400 flex items-center justify-between">
              <span>HAMMING DISTANCE: <strong className="text-white">6 bits (&le; 10 threshold)</strong></span>
              <span className="px-1.5 py-0.2 bg-zinc-900 border border-zinc-700 text-white font-bold">NEAR-DUPLICATE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Syndication & Wire Reprint Clusters */}
      <div className="tactical-panel p-4 border border-zinc-800 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-white" />
            <span className="text-white font-bold uppercase tracking-wider text-xs">
              Syndication Clusters ({data.syndication_clusters.length})
            </span>
          </div>
          <span className="text-zinc-500 text-[10px]">VERIFIED CLUSTER MATRIX</span>
        </div>

        {data.syndication_clusters.length === 0 ? (
          <div className="p-4 text-center text-zinc-500">No syndication clusters detected.</div>
        ) : (
          <div className="space-y-3">
            {data.syndication_clusters.map((cluster, cIdx) => (
              <div key={cIdx} className="tactical-card p-3.5 border border-zinc-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-2 gap-1 text-xs">
                  <div>
                    <span className="text-white font-bold">PRIMARY: {cluster.canonical_source}</span>
                    <span className="text-zinc-400 text-[11px] block">{cluster.original_doc_title}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px]">
                    <span className="badge-tpub">ORIGINAL: {cluster.original_pub_time.slice(0, 10)}</span>
                    <span className="px-1.5 py-0.2 bg-zinc-900 border border-zinc-700 text-white">
                      {cluster.syndicated_reprints.length} REPRINTS
                    </span>
                  </div>
                </div>

                {/* Excerpt / Verdict */}
                <div className="text-[11px] text-zinc-300 font-sans italic bg-black p-2.5 border-l-2 border-white">
                  "{cluster.verdict}"
                </div>

                {/* Syndicated Documents List */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] text-zinc-500 uppercase">IDENTIFIED SECONDARY REPRINTS:</div>
                  {cluster.syndicated_reprints.map((sub, sIdx) => (
                    <div key={sIdx} className="p-2 bg-black/60 border border-zinc-800 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-white font-medium">{sub.source_name}</span> &bull; <span className="text-zinc-400">{sub.title}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-[10px] text-zinc-400 font-mono">
                        <span>Pub: {sub.publication_time.slice(0, 10)}</span>
                        <span>Similarity: {Math.round(sub.text_similarity_pct * 100)}%</span>
                        <span className="text-zinc-300">SimHash D={sub.hamming_distance}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Source Reliability Scorecard Table */}
      <div className="tactical-panel p-4 border border-zinc-800 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-white" />
            <span className="text-white font-bold uppercase tracking-wider text-xs">
              Source Reliability Scorecards ({data.sources.length})
            </span>
          </div>
          <span className="text-zinc-500 text-[10px]">HISTORICAL PROVENANCE METRICS</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-zinc-800">
            <thead className="bg-[#0c0c0e] text-zinc-400 uppercase text-[10px] border-b border-zinc-800">
              <tr>
                <th className="p-2.5">Source Entity</th>
                <th className="p-2.5">Reliability Tier</th>
                <th className="p-2.5">Verified Claims Ratio</th>
                <th className="p-2.5">Total Reports</th>
                <th className="p-2.5">Syndication Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {data.sources.map((src) => (
                <tr key={src.source_name} className="hover:bg-zinc-950 transition-colors">
                  <td className="p-2.5 text-white font-semibold">{src.source_name}</td>
                  <td className="p-2.5">
                    <span className="text-[10px] px-1.5 py-0.2 bg-black border border-zinc-700 text-white font-semibold uppercase">
                      {src.reliability_tier}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-1.5 bg-zinc-900 border border-zinc-800">
                        <div
                          className="h-full bg-white"
                          style={{ width: `${Math.round(src.verified_claims_ratio * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-300">
                        {Math.round(src.verified_claims_ratio * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="p-2.5 text-zinc-300">{src.total_documents}</td>
                  <td className="p-2.5 text-zinc-400">{Math.round(src.syndication_ratio * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
