import React, { useState, useEffect } from 'react';
import {
  Radio, AlertTriangle, ShieldCheck, FileText, CheckCircle2,
  ExternalLink, Copy, HelpCircle, Layers, ArrowRight
} from 'lucide-react';
import { SourceIntelligenceResponse } from '../types';
import { api } from '../services/api';

export const SourceIntelligenceView: React.FC = () => {
  const [data, setData] = useState<SourceIntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);

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
    return <div className="p-8 text-center text-zinc-500 font-mono text-xs">Analyzing source syndication network & circular citations...</div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Top Banner & Circularity Warnings */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-semibold text-white">Source Intelligence & Anti-Circularity Engine</h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {data.sources.length} Indexed Sources &bull; {data.syndication_clusters.length} Syndication Clusters
          </span>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          HistoryFather detects content reuse and wire syndication using 64-bit SimHash locality-sensitive fingerprinting and n-gram shingle Jaccard overlap. 
          When multiple outlets reprint identical paragraphs without providing new primary telemetry, our engine prevents false inflation of corroboration metrics.
        </p>

        {/* Circular Warnings Banner */}
        {data.circular_reporting_warnings.length > 0 && (
          <div className="space-y-2 pt-2">
            {data.circular_reporting_warnings.map((warn, idx) => (
              <div key={idx} className="p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-lg flex items-start space-x-3 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-mono text-rose-300 font-semibold mb-0.5">
                    Circular Reporting & False Corroboration Detected
                  </div>
                  <p className="text-zinc-300 leading-normal font-mono text-[11px]">{warn.warning}</p>
                  <div className="mt-1 text-[10px] text-zinc-500 font-mono">
                    Original Source: {warn.original_source} ({warn.original_time.slice(0, 10)}) &rarr; Echo Outlet: {warn.echo_source} ({warn.echo_time.slice(0, 10)})
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Syndication & Wire Reprint Clusters */}
      <div className="space-y-3">
        <h3 className="text-sm font-mono uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Near-Duplicate & Wire Syndication Clusters ({data.syndication_clusters.length})</span>
        </h3>

        <div className="space-y-3">
          {data.syndication_clusters.map((cluster) => (
            <div key={cluster.cluster_id} className="bg-[#121215] border border-zinc-800 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/70">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/80">
                    {cluster.verdict}
                  </span>
                  <span className="font-semibold text-white text-xs">
                    Original Primary Report: {cluster.original_doc_title}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-zinc-400">
                  Canonical Origin: <strong className="text-zinc-200">{cluster.canonical_source}</strong> ({cluster.original_pub_time.slice(0, 10)})
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase text-zinc-500 block">Syndicated Copies & Wire Echoes:</span>
                {cluster.syndicated_reprints.map((rep) => (
                  <div key={rep.id} className="bg-[#18181c] p-2.5 rounded border border-zinc-800/70 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center space-x-2">
                      <span className="text-zinc-300 font-medium">{rep.source_name}</span>
                      <span className="text-zinc-500">&bull;</span>
                      <span className="text-zinc-400">{rep.title}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60 text-[10px]">
                        {rep.text_similarity_pct}% text reuse
                      </span>
                      <span className="text-zinc-500 text-[11px]">{rep.publication_time.slice(0, 10)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Source Reliability Metrics Table */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-mono uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Source Reliability & Verification Scorecards</span>
          </h3>
          <span className="text-xs text-zinc-500 font-mono">Sorted by Volume & Reliability</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#18181c] text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Source Organization</th>
                <th className="py-3 px-4">Reliability Tier</th>
                <th className="py-3 px-4 text-right">Indexed Reports</th>
                <th className="py-3 px-4 text-right">Verified Ratio</th>
                <th className="py-3 px-4 text-right">Refuted Claims</th>
                <th className="py-3 px-4 text-right">First Scoops</th>
                <th className="py-3 px-4 text-right">Syndication Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {data.sources.map((src) => (
                <tr key={src.source_name} className="hover:bg-[#18181c]/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-white">{src.source_name}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${
                      src.reliability_tier === 'verified_official' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' :
                      src.reliability_tier === 'commercial_threat_intel' ? 'bg-sky-950/60 text-sky-400 border-sky-800/60' :
                      src.reliability_tier === 'independent_research' ? 'bg-purple-950/60 text-purple-400 border-purple-800/60' :
                      'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {src.reliability_tier.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">{src.total_documents}</td>
                  <td className="py-3 px-4 text-right text-emerald-400">{Math.round(src.verified_claims_ratio * 100)}%</td>
                  <td className="py-3 px-4 text-right text-rose-400">{src.refuted_claims_count}</td>
                  <td className="py-3 px-4 text-right text-amber-300">{src.first_to_report_count}</td>
                  <td className="py-3 px-4 text-right text-zinc-400">{Math.round(src.syndication_ratio * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
