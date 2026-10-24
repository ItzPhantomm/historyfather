import React, { useState } from 'react';
import {
  UploadCloud, FileText, CheckCircle2, AlertTriangle,
  Sparkles, Layers, ShieldCheck, ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

interface IngestionHubViewProps {
  onIngestSuccess: () => void;
}

export const IngestionHubView: React.FC<IngestionHubViewProps> = ({ onIngestSuccess }) => {
  const [title, setTitle] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceType, setSourceType] = useState('threat_report');
  const [pubTime, setPubTime] = useState(new Date().toISOString().slice(0, 19) + 'Z');
  const [obsTime, setObsTime] = useState('');
  const [reliabilityTier, setReliabilityTier] = useState('commercial_threat_intel');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !sourceName || !content) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.ingestDocument({
        title,
        source_name: sourceName,
        source_url: sourceUrl || undefined,
        source_type: sourceType,
        publication_time: pubTime,
        observation_time: obsTime || undefined,
        content,
        reliability_tier: reliabilityTier
      });
      setResult(res);
      onIngestSuccess();
    } catch (e: any) {
      alert(`Ingestion failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = (sampleType: string) => {
    if (sampleType === 'cisa_advisory') {
      setTitle('CISA Advisory: Sandworm Team Disrupted via Cyclops Blink Takedown');
      setSourceName('Cybersecurity and Infrastructure Security Agency (CISA)');
      setSourceUrl('https://www.cisa.gov/news-events/cybersecurity-advisories/aa22-054a');
      setSourceType('advisory');
      setReliabilityTier('verified_official');
      setPubTime('2022-02-23T16:00:00Z');
      setObsTime('2022-02-10T00:00:00Z');
      setContent(
        "The Cybersecurity and Infrastructure Security Agency (CISA), Federal Bureau of Investigation (FBI), " +
        "and United Kingdom's National Cyber Security Centre (NCSC) released a joint Cybersecurity Advisory " +
        "identifying a modular malware framework dubbed Cyclops Blink used by the Russian state-sponsored actor " +
        "tracked as Sandworm Team (also known as GRU Unit 74455). " +
        "Cyclops Blink targets WatchGuard and ASUS network appliances to establish a globally resilient command-and-control mesh."
      );
    } else if (sampleType === 'wire_reprint') {
      setTitle('Global Security Wire: Cyclops Blink Botnet Linked to Russian Military Unit');
      setSourceName('Global Security Wire');
      setSourceUrl('https://wire.example.com/cyclops-blink-reprint');
      setSourceType('news_report');
      setReliabilityTier('journalism');
      setPubTime('2022-02-24T04:00:00Z');
      setContent(
        "A joint Cybersecurity Advisory was released identifying a modular malware framework dubbed Cyclops Blink " +
        "used by the Russian state-sponsored actor tracked as Sandworm Team (also known as GRU Unit 74455). " +
        "Cyclops Blink targets WatchGuard and ASUS network appliances to establish a globally resilient command-and-control mesh."
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 shadow-xl space-y-3">
        <div className="flex items-center space-x-2">
          <UploadCloud className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-semibold text-white">Public Intelligence Ingestion & Pipeline Hub</h2>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Ingest new public threat reports, historical disclosures, or legal indictments. HistoryFather automatically:
          <span className="block mt-1 space-y-0.5 font-mono text-zinc-300">
            &bull; Normalizes 4 timestamps (T_pub, T_event, T_obs, T_ingest)<br/>
            &bull; Computes 64-bit SimHash and flags near-duplicate / wire syndication risks<br/>
            &bull; Chunks content into semantic passages and indexes into SQLite FTS5<br/>
            &bull; Runs deterministic entity resolution to unify aliases into canonical clusters
          </span>
        </p>

        {/* Preset Sample Buttons */}
        <div className="flex items-center space-x-2 pt-2 border-t border-zinc-800 text-xs">
          <span className="text-zinc-500 font-mono uppercase text-[11px]">Load Sample Report:</span>
          <button
            type="button"
            onClick={() => handleLoadSample('cisa_advisory')}
            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-300 font-mono text-[11px]"
          >
            Sample: CISA Sandworm Advisory
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample('wire_reprint')}
            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-300 font-mono text-[11px]"
          >
            Sample: Wire Reprint (Test Syndication Warning)
          </button>
        </div>
      </div>

      {/* Ingestion Form */}
      <form onSubmit={handleSubmit} className="bg-[#121215] border border-zinc-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-mono uppercase text-zinc-400 block mb-1">Document Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., CISA Alert AA22-054A: Sandworm Cyclops Blink"
              className="w-full bg-[#18181c] border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-zinc-400 block mb-1">Source Organization *</label>
            <input
              type="text"
              required
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="e.g., CISA / Mandiant / Citizen Lab"
              className="w-full bg-[#18181c] border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-zinc-400 block mb-1">Source URL (Optional)</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#18181c] border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-zinc-400 block mb-1">Publication Time (T_pub) *</label>
            <input
              type="text"
              required
              value={pubTime}
              onChange={(e) => setPubTime(e.target.value)}
              placeholder="2022-02-23T16:00:00Z"
              className="w-full bg-[#18181c] border border-zinc-700 rounded px-3 py-2 text-xs text-sky-300 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-zinc-400 block mb-1">Source Document Category</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full bg-[#18181c] border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none"
            >
              <option value="advisory">Official Advisory / Alert</option>
              <option value="threat_report">Commercial Threat Intelligence Report</option>
              <option value="technical_paper">Independent Research / Academic Paper</option>
              <option value="legal_indictment">Legal Indictment / Sanction Notice</option>
              <option value="news_report">Investigative Journalism / Wire Report</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-zinc-400 block mb-1">Reliability Tier</label>
            <select
              value={reliabilityTier}
              onChange={(e) => setReliabilityTier(e.target.value)}
              className="w-full bg-[#18181c] border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none"
            >
              <option value="verified_official">Verified Official (Law Enforcement / CISA)</option>
              <option value="commercial_threat_intel">Commercial Threat Intel (Mandiant / Microsoft)</option>
              <option value="independent_research">Independent Research (Citizen Lab / Amnesty)</option>
              <option value="journalism">Journalism / Wire Outlet</option>
              <option value="unverified">Unverified Forum / Anonymous Leak</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-mono uppercase text-zinc-400 block mb-1">Raw Report Content *</label>
          <textarea
            required
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste raw report text, forensic indicators, and attribution statements..."
            className="w-full bg-[#18181c] border border-zinc-700 rounded p-3 text-xs text-zinc-100 font-mono focus:outline-none focus:border-sky-500 resize-y leading-relaxed"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-zinc-800 text-white rounded text-xs font-semibold uppercase tracking-wider font-mono flex items-center space-x-2 transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{loading ? 'Processing & Indexing...' : 'Ingest & Index Report'}</span>
          </button>
        </div>
      </form>

      {/* Ingestion Response Card */}
      {result && (
        <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="text-sm font-semibold font-mono">Report Successfully Ingested and Indexed</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block">Document ID</span>
              <span className="text-zinc-200"><code>{result.document_id}</code></span>
            </div>
            <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block">Passages Indexed</span>
              <span className="text-sky-400 font-bold">{result.passages_count} chunks</span>
            </div>
            <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block">Recognized Entities</span>
              <span className="text-emerald-400 font-bold">{result.extracted_entities.length} detected</span>
            </div>
            <div className="bg-zinc-900 p-2.5 rounded border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase block">Syndication Status</span>
              <span className={result.is_near_duplicate ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {result.is_near_duplicate ? 'Near-Duplicate Detected' : 'Original Text'}
              </span>
            </div>
          </div>

          {result.is_near_duplicate && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded text-xs text-rose-300 font-mono">
              <strong>Anti-Circularity Warning:</strong> This report matches prior document <code>{result.near_duplicate_of}</code> (SimHash distance: {result.simhash_distance}). It has been flagged as syndicated and will not count as independent corroboration.
            </div>
          )}

          {result.extracted_entities.length > 0 && (
            <div className="text-xs text-zinc-300 font-mono pt-2">
              <span className="text-zinc-500">Auto-Resolved Entities:</span>{' '}
              {result.extracted_entities.map((e: string, i: number) => (
                <span key={i} className="inline-block bg-zinc-800 px-2 py-0.5 rounded text-zinc-200 mr-1.5 mt-1">
                  {e}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
