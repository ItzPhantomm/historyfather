<p align="center">
  <img src="assets/banner.svg" alt="HistoryFather // High-Assurance Temporal Intelligence" width="100%" />
</p>

<p align="center">
  <a href="#core-architecture"><img src="https://img.shields.io/badge/Engine-Temporal_Intelligence-09090b?style=for-the-badge&logo=databricks&logoColor=38bdf8&labelColor=18181b" alt="Engine" /></a>
  <a href="#strict-four-timestamp-model"><img src="https://img.shields.io/badge/Temporal_Coordinates-4--Timestamp_Model-09090b?style=for-the-badge&logo=speedtest&logoColor=34d399&labelColor=18181b" alt="Temporal Coordinates" /></a>
  <a href="#interactive-temporal-relationship-graph"><img src="https://img.shields.io/badge/Graph-NetworkX_Topological-09090b?style=for-the-badge&logo=diagramsdotnet&logoColor=f43f5e&labelColor=18181b" alt="Graph Engine" /></a>
  <a href="#6-automated-test-suite"><img src="https://img.shields.io/badge/Verification-25%20Passed-09090b?style=for-the-badge&logo=checkmarx&logoColor=10b981&labelColor=18181b" alt="Verification" /></a>
</p>

<p align="center">
  <img src="https://skillicons.dev/icons?i=python,fastapi,sqlite,react,ts,tailwind,vite,docker,git&theme=dark" alt="HistoryFather Tech Stack" />
</p>

# HistoryFather // Temporal Intelligence Search Engine

> **"Search history as evidence, not just a list of results."**

HistoryFather is a production-grade temporal intelligence search engine designed for intelligence analysts, forensic investigators, and security researchers to reconstruct how entities, events, claims, and relationships evolve across time.

Instead of flattening history into a static snapshot, HistoryFather answers three core investigative questions with verifiable evidence:
1. **What was known then?** (Point-in-time state & historical fog-of-war)
2. **What changed?** (Temporal diffing: newly observed entities, altered ties, refuted claims)
3. **What supports that conclusion?** (Every edge and claim backed by traceable verbatim passages, timestamps, and deduplicated provenance)

---

### Interactive Temporal Relationship Graph

<p align="center">
  <img src="assets/temporal-graph.svg" alt="HistoryFather Interactive Temporal Relationship Graph &amp; Timeline Scrubber" width="100%" />
</p>

- **Topological Multi-Directed Graph (`NetworkX`)**: Visualizes directed influence, attack vectors (`TARGETS`, `EXPLOITS`, `DEPLOYS`), and attribution ties (`ATTRIBUTED_TO`).
- **Verbatim Provenance Excerpts**: Every edge is bound to primary source document excerpts with exact timestamp markers ($T_{pub}$, $T_{event}$).
- **Historical Fog-of-War Scrubber**: Dynamically scrubs historical knowledge states between 2014 and 2026 without retroactive contamination.

---

## 1. Core Architecture

```
/root/historyfather/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI REST API & static file serving
│   │   ├── db/
│   │   │   ├── database.py             # SQLite WAL connection manager & FTS5 bindings
│   │   │   └── schema.sql              # Normalized tables for entities, claims, events, evidence
│   │   ├── schemas/
│   │   │   └── models.py               # Pydantic validation models
│   │   └── services/
│   │       ├── dedup_engine.py         # 64-bit SimHash, MinHash shingling, & circular reporting detection
│   │       ├── entity_resolution.py    # Deterministic canonical alias matching & Jaro-Winkler distance
│   │       ├── temporal_engine.py      # 4-timestamp engine, point-in-time travel, & snapshot diffs
│   │       ├── graph_engine.py         # NetworkX temporal graph projection & shortest pathfinder
│   │       ├── source_intelligence.py  # Source reliability scoring & wire reprint syndication clusters
│   │       ├── dossier_engine.py       # Case workspace manager & Markdown/HTML/JSON dossier exports
│   │       ├── ingestion.py            # Passage chunking, FTS5 indexing, & entity auto-tagging
│   │       └── seed_data.py            # Verified intelligence cases (SolarWinds, NotPetya, Ronin, Pegasus, Stuxnet)
│   ├── tests/
│   │   ├── test_api.py                 # FastAPI client integration tests
│   │   ├── test_dedup.py               # SimHash & circularity warning tests
│   │   ├── test_entity_resolution.py   # Canonical alias & fuzzy resolution tests
│   │   ├── test_temporal_engine.py     # Dual-track timeline & temporal diff tests
│   │   └── test_graph_engine.py        # NetworkX multi-graph & edge evidence tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SearchTimelineView.tsx  # Dual-track timeline & point-in-time search
│   │   │   ├── RelationshipGraphView.tsx # Interactive force-directed SVG graph & edge evidence
│   │   │   ├── TemporalDiffView.tsx    # Snapshot comparison engine ($T_1$ vs $T_2$)
│   │   │   ├── SourceIntelligenceView.tsx # Wire reprint syndication & circularity warnings
│   │   │   ├── WorkspaceDossierView.tsx # Hypothesis ledger & multi-format export
│   │   │   ├── IngestionHubView.tsx    # Document ingestion adapter & auto-dedup
│   │   │   └── EvidenceInspector.tsx   # Slide-out verbatim quote & 4-timestamp drawer
│   │   ├── services/
│   │   │   └── api.ts                  # Typed async API client
│   │   ├── types/
│   │   │   └── index.ts                # TypeScript domain models
│   │   ├── App.tsx                     # Main workstation layout
│   │   └── index.css                   # Dark intelligence workstation styling
│   ├── dist/                           # Compiled production frontend bundle
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── run.sh                              # Standalone launch script
└── README.md
```

---

## 2. Intelligence Integrity Guarantees

### Strict Four-Timestamp Model
HistoryFather strictly separates four temporal dimensions and never treats them as interchangeable:
1. **$T_{pub}$ (Publication Time):** When the intelligence report or advisory was published to the public.
2. **$T_{event}$ (Event Time):** When the underlying physical or cyber incident took place in history.
3. **$T_{obs}$ (Observation Time):** When telemetry, sensors, or analysts first documented the activity.
4. **$T_{ingest}$ (Ingestion Time):** When HistoryFather parsed and indexed the document.

### Status & Certainty Taxonomy
Every claim and relationship is assigned an explicit epistemic status:
- `verified_fact`: Backed by multi-source primary telemetry, cryptographic signatures, or official forensic consensus.
- `source_reported`: Claim asserted by a specific author or vendor (may be unverified or biased).
- `inferred_relationship`: Derived via IOC overlap, co-occurrence, behavioral heuristics, or graph clustering.
- `unresolved_hypothesis`: Actively contested theory or temporary attribution cluster (e.g. UNC2452).
- `refuted_or_superseded`: Previously asserted claim explicitly retracted, revised, or disproven by newer forensic evidence.

### Deduplication & Anti-Circularity Engine
To prevent the echo-chamber effect where syndicated press wires or identical blog posts falsely inflate corroboration:
- **64-bit SimHash**: Computes locality-sensitive fingerprints over multi-order feature shingles (unigrams, bigrams, trigrams).
- **Hamming Distance & Jaccard Shingling**: Identifies copy-paste reprints and wire stories ($D \le 10$ or Jaccard $\ge 0.35$).
- **Circular Reporting Alerts**: Automatically flags secondary outlets publishing identical text without citing primary sources, warning investigators: *"Do NOT treat this as independent secondary corroboration."*

### Deterministic Entity Resolution
- Canonical registry unifying codenames, aliases, and tracking identifiers (e.g., `APT29` = `Midnight Blizzard` = `Nobelium` = `Cozy Bear` = `The Dukes` = `UNC2452`).
- Exact normalized alias lookup + Jaro-Winkler string distance for slight variations and typos.
- Transparent explainability cards detailing *why* an entity was matched.

---

## 3. Preloaded Historical Intelligence Cases

The database comes pre-seeded with 5 comprehensive real-world cases:
1. **APT29 / Midnight Blizzard / SolarWinds Supply Chain Campaign (2020–2024)**:
   - Initial FireEye disclosure of SUNBURST backdoor & temporary cluster UNC2452 (Dec 2020).
   - Global Wire Syndicate copy-paste reprint (demonstrating syndication detection).
   - CISA Alert AA21-008A formal attribution to Russian Foreign Intelligence Service SVR (April 2021).
   - Midnight Blizzard Microsoft executive email breach via password spray (Jan 2024).
2. **Sandworm / BlackEnergy / NotPetya / HermeticWiper (2015–2023)**:
   - Ukrainian power grid blackout (Dec 2015).
   - NotPetya pseudo-ransomware outbreak (June 2017) with preserved claim revision demonstrating how early financial ransomware claims were refuted and proven to be destructive military wipers.
   - US DOJ indictment of GRU Unit 74455 officers (Oct 2020).
3. **Lazarus Group / APT38 / Axie Infinity Ronin Bridge ($620M) (2014–2024)**:
   - Five validator keys compromised to drain 173,600 ETH and 25.5M USDC (March 2022).
   - US FBI and OFAC formal attribution to DPRK state-sponsored Lazarus Group (April 2022).
4. **Pegasus Spyware / NSO Group / Citizen Lab (2016–2023)**:
   - Ahmed Mansoor UAE activist targeting via Trident iOS zero-days (Aug 2016).
   - US Department of Commerce Entity List blacklisting of NSO Group (Nov 2021).
5. **Stuxnet / Olympic Games / Natanz Enrichment Facility (2010–2012)**:
   - Symantec technical dossier detailing physical sabotage of IR-1 centrifuge rotors (Nov 2010).
   - New York Times Sanger investigation revealing Operation Olympic Games (June 2012).

---

## 4. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check endpoint |
| `GET` | `/api/status` | System metrics (documents, entities, events, claims, workspaces) |
| `POST` | `/api/search` | Unified FTS5 + temporal filter search with entity resolution |
| `GET` | `/api/timeline` | Chronological timeline reconstruction (event time or publication time) |
| `GET` | `/api/graph` | NetworkX entity relationship graph projection with temporal bounds |
| `GET` | `/api/graph/path` | Shortest multi-hop connection pathfinder between two entities |
| `GET` | `/api/relationships/{id}/evidence` | Verbatim evidence excerpts backing a specific graph edge |
| `POST` | `/api/diff` | Temporal diff comparison: Snapshot A ($T_1$) vs Snapshot B ($T_2$) |
| `GET` | `/api/entities` | List canonical entities with type filters and degree counts |
| `POST` | `/api/entities/resolve` | Deterministic entity resolution query with match explanations |
| `GET` | `/api/sources` | Source reliability scorecards, syndication clusters, and circularity warnings |
| `GET` | `/api/workspaces` | List active investigation dossiers |
| `POST` | `/api/workspaces` | Create an investigation workspace |
| `POST` | `/api/workspaces/{id}/items` | Pin evidence item with hypothesis stance (supports/refutes) and note |
| `GET` | `/api/workspaces/{id}/export/markdown` | Download executive Markdown intelligence report |
| `GET` | `/api/workspaces/{id}/export/html` | Standalone print-ready dark intelligence HTML briefing |
| `GET` | `/api/workspaces/{id}/export/json` | Export structured JSON dossier |
| `POST` | `/api/ingest` | Ingest new public report, auto-chunk, index into FTS5, and detect duplicates |
| `POST` | `/api/admin/reseed` | Re-seed database with standard historical cases |

---

## 5. Verification & Testing

The backend is backed by an automated test suite covering all critical algorithmic requirements:

```bash
cd /root/historyfather/backend
PYTHONPATH=. pytest tests -v
```

All 25 automated tests verify:
- Exact SHA-256 and 64-bit SimHash Hamming distance
- Syndication cluster detection and circular reporting alerts
- Exact canonical alias resolution and fuzzy Jaro-Winkler string matching
- Temporal point-in-time filtering ("as-of" time travel)
- Snapshot comparison diffing ($T_1$ vs $T_2$)
- NetworkX graph projections and shortest path calculation
- Edge evidence traceability
- Multi-format workspace dossier export (Markdown, HTML, JSON)
- Document ingestion pipeline

---

## 6. Running HistoryFather

To start the unified production server (FastAPI serving the compiled React intelligence workstation and REST API):

```bash
cd /root/historyfather
./run.sh
```

Then navigate to `http://localhost:8000` in any web browser.
