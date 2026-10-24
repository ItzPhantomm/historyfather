import React, { useState } from 'react';
import {
  UploadCloud, FileText, CheckCircle2, AlertTriangle,
  Sparkles, Layers, ShieldCheck, ArrowRight, Terminal, Binary
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
      setTitle('CISA Advisory AA22-054A: Sandworm Team Disrupted via Cyclops Blink Takedown');
      setSourceName('Cybersecurity and Infrastructure Security Agency (CISA)');
      setSourceUrl('https://www.cisa.gov/news-events/cybersecurity-advisories/aa22-054a');
      setSourceType('advisory');
      setReliabilityTier('verified_official');
      setPubTime('2022-02-23T16:00:00Z');
      setObsTime('2022-02-10T00:00:00Z');
      setContent(
        "The Cybersecurity and Infrastructure Security Agency (CISA), Federal Bureau of Investigation (FBI), " +
        "and United Kingdom's National Cyber Security Centre (NCSC) released a joint Cybersecurity Advisory " +
        "identifying that the Russian state-sponsored cyber group known as Sandworm Team has been utilizing a new " +
        "modular malware framework referred to as Cyclops Blink. Cyclops Blink replaces the legacy VPNFilter malware " +
        "previously deployed by GRU Unit 74455 against network devices globally."
      );
    } else if (sampleType === 'wire_reprint') {
      setTitle('Global Wire Syndicate: Russian Sandworm Hackers Target Routers');
      setSourceName('Global Wire Syndicate');
      setSourceUrl('https://globalwiresyndicate.example.com/cyber/sandworm-cyclops');
      setSourceType('news_article');
      setReliabilityTier('unverified_media');
      setPubTime('2022-02-24T08:00:00Z');
      setObsTime('2022-02-10T00:00:00Z');
      setContent(
        "The Cybersecurity and Infrastructure Security Agency (CISA), Federal Bureau of Investigation (FBI), " +
        "and United Kingdom's National Cyber Security Centre (NCSC) released a joint Cybersecurity Advisory " +
        "identifying that the Russian state-sponsored cyber group known as Sandworm Team has been utilizing a new " +
        "modular malware framework referred to as Cyclops Blink. Cyclops Blink replaces the legacy VPNFilter malware " +
        "previously deployed by GRU Unit 74455 against network devices globally."
      );
    }
  };

  return (
    <div className="space-y-5 font-mono text-xs">
      {/* Header Bar */}
      <div className="tactical-panel p-4 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-4 h-4 text-white" />
            <span className="text-white font-bold uppercase tracking-wider text-xs">
              Document Ingestion & Automated Fingerprinting Pipeline
            </span>
          </div>
          <span className="text-[10px] text-zinc-500">
            FTS5 PASSAGE CHUNKER // 64-BIT SIMHASH // CANONICAL ENTITY RESOLVER
          </span>
        </div>

        <p className="text-zinc-400 font-sans text-xs leading-relaxed">
          Ingest raw threat reports, advisories, or investigative transcripts. Documents are automatically chunked into forensic passages, indexed for FTS5 full-text search, fingerprinted with 64-bit SimHash, and cross-referenced against canonical entity aliases.
        </p>

        {/* Preset Sample Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-zinc-500 text-[10px] uppercase">TEST FIXTURES:</span>
          <button
            type="button"
            onClick={() => handleLoadSample('cisa_advisory')}
            className="px-2 py-0.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] transition-colors"
          >
            [1] CISA Official Advisory (Cyclops Blink)
          </button>
          <button
            type="button"
            onClick={() => handleLoadSample('wire_reprint')}
            className="px-2 py-0.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] transition-colors"
          >
            [2] Wire Syndicate Reprint (Trigger Circular Warning)
          </button>
        </div>
      </div>

      {/* Main Ingest Form */}
      <form onSubmit={handleSubmit} className="tactical-panel p-4 border border-zinc-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-zinc-500 block">Report / Document Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Mandiant Threat Intelligence Report: APT29 Infrastructure"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black border border-zinc-800 text-white px-2.5 py-1.5 text-xs font-mono focus:border-white focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-zinc-500 block">Primary Author / Source Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Mandiant / FireEye / Microsoft MSTIC"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="w-full bg-black border border-zinc-800 text-white px-2.5 py-1.5 text-xs font-mono focus:border-white focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-zinc-500 block">Publication Time (T_pub ISO)</label>
            <input
              type="text"
              required
              value={pubTime}
              onChange={(e) => setPubTime(e.target.value)}
              className="w-full bg-black border border-zinc-800 text-white px-2.5 py-1.5 text-xs font-mono focus:border-white focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-zinc-500 block">Observation Incident Time (T_event ISO)</label>
            <input
              type="text"
              placeholder="e.g. 2022-02-10T00:00:00Z"
              value={obsTime}
              onChange={(e) => setObsTime(e.target.value)}
              className="w-full bg-black border border-zinc-800 text-white px-2.5 py-1.5 text-xs font-mono focus:border-white focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-zinc-500 block">Reliability Tier</label>
            <select
              value={reliabilityTier}
              onChange={(e) => setReliabilityTier(e.target.value)}
              className="w-full bg-black border border-zinc-800 text-white px-2.5 py-1.5 text-xs font-mono focus:border-white focus:outline-none"
            >
              <option value="verified_official">Official Government Advisory / Court Indictment</option>
              <option value="commercial_threat_intel">Tier-1 Commercial Threat Intel (FireEye, Mandiant)</option>
              <option value="academic_forensic">Academic Forensic Laboratory (Citizen Lab)</option>
              <option value="unverified_media">Syndicated Media / News Outlet</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase text-zinc-500 block">Raw Report Content / Telemetry Text</label>
          <textarea
            rows={7}
            required
            placeholder="Paste raw markdown, threat advisory passage, IOC tables, or attribution notes here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-black border border-zinc-800 text-white p-3 text-xs font-mono focus:border-white focus:outline-none leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <span className="text-[10px] text-zinc-500">
            PAYLOAD VERIFICATION: SHA-256 + 64-BIT SIMHASH CALCULATED AUTOMATICALLY
          </span>
          <button
            type="submit"
            disabled={loading || !title || !content}
            className="px-4 py-2 bg-white text-black hover:bg-zinc-200 font-bold uppercase tracking-wider text-xs transition-colors disabled:bg-zinc-800 disabled:text-zinc-600"
          >
            {loading ? 'INGESTING & FINGERPRINTING...' : 'INGEST & INDEX DOCUMENT'}
          </button>
        </div>
      </form>

      {/* Ingestion Results Telemetry Card */}
      {result && (
        <div className="tactical-panel p-4 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span className="text-white font-bold uppercase tracking-wider text-xs">
                Ingestion Succeeded: Document {result.document_id}
              </span>
            </div>
            <span className="text-zinc-400 text-[10px]">STATUS // COMMITTED TO DB</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-black p-2.5 border border-zinc-800">
              <span className="text-[9px] uppercase text-zinc-500 block">Passages Chunked</span>
              <span className="text-white font-bold text-base">{result.passages_count}</span>
            </div>
            <div className="bg-black p-2.5 border border-zinc-800">
              <span className="text-[9px] uppercase text-zinc-500 block">Entity Mentions</span>
              <span className="text-white font-bold text-base">{result.entity_mentions_count}</span>
            </div>
            <div className="bg-black p-2.5 border border-zinc-800">
              <span className="text-[9px] uppercase text-zinc-500 block">SimHash Fingerprint</span>
              <span className="text-zinc-200 font-mono text-[11px] truncate block">{result.simhash}</span>
            </div>
            <div className="bg-black p-2.5 border border-zinc-800">
              <span className="text-[9px] uppercase text-zinc-500 block">Syndication Status</span>
              <span className={`text-[11px] font-bold ${result.is_syndicated ? 'text-zinc-400 underline' : 'text-white'}`}>
                {result.is_syndicated ? 'SYNDICATED COPY' : 'PRIMARY SOURCE'}
              </span>
            </div>
          </div>

          {result.syndication_warning && (
            <div className="p-3 bg-zinc-950 border border-zinc-700 text-xs">
              <div className="text-white font-bold uppercase mb-1">Syndication Notice</div>
              <div className="text-zinc-300 font-sans">{result.syndication_warning}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
