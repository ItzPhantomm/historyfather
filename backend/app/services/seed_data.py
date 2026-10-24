"""
Comprehensive Seed Data for HistoryFather.
Populates rich, verified historical intelligence cases:
  1. APT29 / Midnight Blizzard / SolarWinds Supply Chain Campaign (2020-2024)
  2. Sandworm / BlackEnergy / NotPetya / HermeticWiper (2015-2023)
  3. Lazarus Group / APT38 / Ronin Bridge Crypto Heist (2014-2024)
  4. Pegasus Spyware / NSO Group / Citizen Lab (2016-2023)
  5. Stuxnet / Olympic Games / Natanz (2010-2012)
Includes exact and near-duplicate wire syndication, superseded claims, and contradictory evidence.
"""

import json
import uuid
from datetime import datetime, timezone
from app.db.database import get_connection
from app.services.dedup_engine import compute_sha256, compute_simhash

def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def seed_database(db_conn=None):
    conn = db_conn or get_connection()
    now = utcnow_iso()

    # Temporarily disable foreign keys during batch cleanup & reload
    conn.execute("PRAGMA foreign_keys = OFF;")

    # Clear existing tables
    tables = [
        "relationship_evidence", "relationships", "claim_revisions", "claims",
        "events", "entity_aliases", "entities", "passages", "documents",
        "workspace_notes", "workspace_items", "workspaces"
    ]
    for tbl in tables:
        conn.execute(f"DELETE FROM {tbl};")
    try:
        conn.execute("DELETE FROM fts_passages;")
    except Exception:
        pass

    # ==========================================
    # 1. CANONICAL ENTITIES & ALIASES
    # ==========================================
    entities_data = [
        {
            "id": "ent_apt29",
            "canonical_name": "APT29",
            "entity_type": "threat_actor",
            "first_observed_time": "2014-06-01T00:00:00Z",
            "last_observed_time": "2024-03-01T00:00:00Z",
            "summary": "State-sponsored cyber espionage group attributed to Russia's Foreign Intelligence Service (SVR). Known for long-term stealth, supply-chain compromises, and targeting diplomatic and government networks.",
            "confidence_score": 0.98,
            "aliases": [
                ("Midnight Blizzard", "codename", 0.98),
                ("Nobelium", "tracking_id", 0.98),
                ("Cozy Bear", "codename", 0.98),
                ("UNC2452", "temporary_cluster", 0.90),
                ("The Dukes", "synonym", 0.95),
                ("YTTRIUM", "former_name", 0.92)
            ]
        },
        {
            "id": "ent_solarwinds",
            "canonical_name": "SolarWinds Orion",
            "entity_type": "organization",
            "first_observed_time": "2020-03-01T00:00:00Z",
            "last_observed_time": "2021-04-15T00:00:00Z",
            "summary": "IT infrastructure management platform whose build environment was compromised by APT29 to insert the SUNBURST backdoor.",
            "confidence_score": 1.0,
            "aliases": [
                ("SolarWinds", "synonym", 0.99),
                ("Orion IT Management", "product_name", 0.95)
            ]
        },
        {
            "id": "ent_sunburst",
            "canonical_name": "SUNBURST",
            "entity_type": "malware",
            "first_observed_time": "2020-03-01T00:00:00Z",
            "last_observed_time": "2021-01-15T00:00:00Z",
            "summary": "Stealthy trojanized backdoor injected into SolarWinds.Orion.Core.BusinessLayer.dll, communicating via pseudo-random DGA subdomains of avsvmcloud.com.",
            "confidence_score": 1.0,
            "aliases": [
                ("Solorigate", "synonym", 0.98),
                ("SolarMarker backdoor", "variant", 0.85)
            ]
        },
        {
            "id": "ent_sandworm",
            "canonical_name": "Sandworm Team",
            "entity_type": "threat_actor",
            "first_observed_time": "2014-01-01T00:00:00Z",
            "last_observed_time": "2023-11-01T00:00:00Z",
            "summary": "Military cyber operations unit affiliated with Russian GRU Unit 74455 (Main Intelligence Directorate). Responsible for Ukrainian power grid blackouts, NotPetya wiper, and Olympic Destroyer.",
            "confidence_score": 0.99,
            "aliases": [
                ("Voodoo Bear", "codename", 0.98),
                ("TeleBots", "codename", 0.95),
                ("BlackEnergy Group", "former_name", 0.92),
                ("IRON VIKING", "tracking_id", 0.90),
                ("GRU Unit 74455", "official_attribution", 0.99)
            ]
        },
        {
            "id": "ent_notpetya",
            "canonical_name": "NotPetya",
            "entity_type": "malware",
            "first_observed_time": "2017-06-27T00:00:00Z",
            "last_observed_time": "2017-08-01T00:00:00Z",
            "summary": "Destructive wiper disguised as Petya ransomware. Exploited EternalBlue and PsExec to destroy master boot records globally causing over $10B in damages.",
            "confidence_score": 1.0,
            "aliases": [
                ("Nyetya", "synonym", 0.98),
                ("ExPetr", "synonym", 0.98),
                ("EternalPetya", "synonym", 0.92)
            ]
        },
        {
            "id": "ent_lazarus",
            "canonical_name": "Lazarus Group",
            "entity_type": "threat_actor",
            "first_observed_time": "2014-11-01T00:00:00Z",
            "last_observed_time": "2024-02-01T00:00:00Z",
            "summary": "North Korean state-sponsored threat group linked to the Reconnaissance General Bureau (RGB). Conducts espionage, cyber heists against banks, cryptocurrency theft, and destructive attacks.",
            "confidence_score": 0.99,
            "aliases": [
                ("Hidden Cobra", "us_gov_tracking", 0.99),
                ("APT38", "financial_subdivision", 0.95),
                ("Zinc", "microsoft_codename", 0.98),
                ("TraderTraitor", "campaign_tracking", 0.92)
            ]
        },
        {
            "id": "ent_ronin",
            "canonical_name": "Axie Infinity Ronin Bridge",
            "entity_type": "infrastructure",
            "first_observed_time": "2022-03-23T00:00:00Z",
            "last_observed_time": "2022-04-14T00:00:00Z",
            "summary": "Ethereum-compatible sidechain bridge operated by Sky Mavis, exploited in March 2022 for 173,600 ETH and 25.5M USDC (~$620M).",
            "confidence_score": 1.0,
            "aliases": [
                ("Ronin Network", "synonym", 0.98),
                ("Sky Mavis Ronin Bridge", "canonical_infrastructure", 0.95)
            ]
        },
        {
            "id": "ent_pegasus",
            "canonical_name": "Pegasus Spyware",
            "entity_type": "malware",
            "first_observed_time": "2016-08-01T00:00:00Z",
            "last_observed_time": "2023-09-01T00:00:00Z",
            "summary": "Commercial zero-click mobile surveillance tool developed by Israeli firm NSO Group. Capable of exfiltrating encrypted messages, activating cameras/microphones, and GPS tracking.",
            "confidence_score": 0.98,
            "aliases": [
                ("NSO Pegasus", "synonym", 0.99),
                ("Chrysaor", "android_variant", 0.90),
                ("Trident Spyware", "original_exploit_family", 0.92)
            ]
        },
        {
            "id": "ent_nso_group",
            "canonical_name": "NSO Group",
            "entity_type": "organization",
            "first_observed_time": "2016-08-01T00:00:00Z",
            "last_observed_time": "2023-11-01T00:00:00Z",
            "summary": "Israeli cyber intelligence contractor and vendor of military-grade surveillance technologies, placed on the US Entity List in 2021.",
            "confidence_score": 1.0,
            "aliases": [
                ("Q Cyber Technologies", "parent_holding", 0.95),
                ("OSY Technologies", "affiliate", 0.90)
            ]
        },
        {
            "id": "ent_stuxnet",
            "canonical_name": "Stuxnet",
            "entity_type": "malware",
            "first_observed_time": "2010-06-17T00:00:00Z",
            "last_observed_time": "2012-06-01T00:00:00Z",
            "summary": "First known weaponized cyber kinetic worm specifically engineered to sabotage Siemens S7-300 PLCs driving IR-1 uranium enrichment centrifuges at Iran's Natanz facility.",
            "confidence_score": 1.0,
            "aliases": [
                ("Olympic Games Worm", "operation_name", 0.95),
                ("W32.Stuxnet", "symantec_identifier", 0.99)
            ]
        },
        {
            "id": "ent_natanz",
            "canonical_name": "Natanz Uranium Enrichment Plant",
            "entity_type": "geopolitical_entity",
            "first_observed_time": "2007-01-01T00:00:00Z",
            "last_observed_time": "2012-06-01T00:00:00Z",
            "summary": "Underground Iranian nuclear enrichment facility housing cascades of IR-1 centrifuges targeted by Operation Olympic Games.",
            "confidence_score": 1.0,
            "aliases": [
                ("Natanz Fuel Enrichment Plant", "official_name", 0.99),
                ("FEP Natanz", "acronym", 0.95)
            ]
        }
    ]

    for ent in entities_data:
        conn.execute(
            """
            INSERT INTO entities (id, canonical_name, entity_type, first_observed_time, last_observed_time, summary, confidence_score, resolution_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (ent["id"], ent["canonical_name"], ent["entity_type"], ent["first_observed_time"], ent["last_observed_time"], ent["summary"], ent["confidence_score"], "canonical")
        )
        for alias, atype, conf in ent["aliases"]:
            alias_id = f"alias_{uuid.uuid4().hex[:8]}"
            norm_alias = " ".join("".join(c for c in alias.lower() if c.isalnum() or c.isspace()).split())
            conn.execute(
                """
                INSERT INTO entity_aliases (id, entity_id, alias, normalized_alias, alias_type, confidence)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (alias_id, ent["id"], alias, norm_alias, atype, conf)
            )

    # ==========================================
    # 2. DOCUMENTS & PASSAGES (Reports, Advisories, Syndicated reprints)
    # ==========================================
    docs_data = [
        # --- SolarWinds Case ---
        {
            "id": "doc_fireeye_2020",
            "title": "Highly Evasive Attacker Leverages SolarWinds Supply Chain to Access High-Profile Networks",
            "source_name": "FireEye / Mandiant",
            "source_url": "https://www.mandiant.com/resources/evasive-attacker-leverages-solarwinds-supply-chain",
            "source_type": "threat_report",
            "publication_time": "2020-12-13T18:00:00Z",
            "observation_time": "2020-12-08T09:00:00Z",
            "reliability_tier": "commercial_threat_intel",
            "raw_content": (
                "FireEye has uncovered a widespread campaign by an advanced threat actor, designated UNC2452. "
                "The actor inserted a backdoor into software updates of the SolarWinds Orion IT performance monitoring application. "
                "The trojanized component, SolarWinds.Orion.Core.BusinessLayer.dll, was digitally signed by SolarWinds between March and May 2020. "
                "Once delivered, the backdoor, dubbed SUNBURST, lies dormant for up to two weeks before resolving C2 servers disguised as avsvmcloud.com subdomains. "
                "Initial attribution remains tentative; UNC2452 exhibits discipline and operational security consistent with a premier nation-state intelligence service."
            ),
            "is_syndicated": 0,
            "canonical_source_id": None
        },
        {
            "id": "doc_reuters_solarwinds_syndicate",
            "title": "Suspected Russian Hackers Spied on US Treasury and Commerce via SolarWinds Hack",
            "source_name": "Global Wire Syndicate",
            "source_url": "https://wire.example.com/2020/solarwinds-spies",
            "source_type": "news_report",
            "publication_time": "2020-12-14T02:30:00Z",
            "observation_time": "2020-12-13T20:00:00Z",
            "reliability_tier": "journalism",
            "raw_content": (
                "A sophisticated threat group has infiltrated the US Treasury Department and Commerce Department. "
                "The actor inserted a backdoor into software updates of the SolarWinds Orion IT performance monitoring application. "
                "The trojanized component, SolarWinds.Orion.Core.BusinessLayer.dll, was digitally signed by SolarWinds between March and May 2020. "
                "Once delivered, the backdoor, dubbed SUNBURST, lies dormant for up to two weeks before resolving C2 servers disguised as avsvmcloud.com subdomains. "
                "Sources state the operational security is consistent with a Russian government intelligence operation."
            ),
            "is_syndicated": 1,
            "canonical_source_id": "doc_fireeye_2020"
        },
        {
            "id": "doc_cisa_aa21_008a",
            "title": "CISA Alert AA21-008A: Detecting APT29 Malicious Cyber Activity in SolarWinds Supply Chain",
            "source_name": "CISA / FBI / ODNI",
            "source_url": "https://www.cisa.gov/news-events/cybersecurity-advisories/aa21-008a",
            "source_type": "advisory",
            "publication_time": "2021-04-15T12:00:00Z",
            "observation_time": "2021-01-05T00:00:00Z",
            "reliability_tier": "verified_official",
            "raw_content": (
                "The Federal Bureau of Investigation (FBI), Cybersecurity and Infrastructure Security Agency (CISA), "
                "and National Security Agency (NSA) formally identify the Russian Foreign Intelligence Service (SVR), "
                "also known as APT29, Cozy Bear, and The Dukes, as the perpetrator of the SolarWinds Orion software supply chain compromise. "
                "The SVR actor used SUNBURST and subsequent TEARDROP droppers to bypass MFA and forge SAML tokens, "
                "granting persistent administrative access into victim Microsoft 365 cloud environments. "
                "Earlier temporary tracking designations such as UNC2452 are hereby consolidated into the SVR / APT29 threat actor profile."
            ),
            "is_syndicated": 0,
            "canonical_source_id": None
        },
        {
            "id": "doc_msft_midnight_blizzard_2024",
            "title": "Microsoft Actions Following Attack by Nation-State Actor Midnight Blizzard",
            "source_name": "Microsoft MSTIC",
            "source_url": "https://msrc.microsoft.com/blog/2024/01/midnight-blizzard-guidance",
            "source_type": "threat_report",
            "publication_time": "2024-01-19T21:00:00Z",
            "observation_time": "2024-01-12T10:00:00Z",
            "reliability_tier": "commercial_threat_intel",
            "raw_content": (
                "Beginning in late November 2023, the Russian state-sponsored actor Midnight Blizzard (also tracked as Nobelium and APT29) "
                "used a password spray attack to compromise a legacy, non-production test tenant. "
                "The actor successfully accessed a small percentage of Microsoft corporate email accounts, including members of our senior leadership team "
                "and cybersecurity staff, exfiltrating emails and attached documents. "
                "This campaign demonstrates Midnight Blizzard's continued focus on targeting technology and cybersecurity vendors to reconstruct historical investigations."
            ),
            "is_syndicated": 0,
            "canonical_source_id": None
        },

        # --- Sandworm Case ---
        {
            "id": "doc_cisa_ukraine_grid_2016",
            "title": "Cyber-Attack Against Ukrainian Critical Infrastructure (BlackEnergy 3)",
            "source_name": "CISA / US-CERT",
            "source_url": "https://www.cisa.gov/news-events/alerts/2016/02/25/alert-ir-alert-h-16-056-01",
            "source_type": "advisory",
            "publication_time": "2016-02-25T14:00:00Z",
            "observation_time": "2015-12-23T15:30:00Z",
            "reliability_tier": "verified_official",
            "raw_content": (
                "On December 23, 2015, Ukrainian regional electricity distribution companies experienced unscheduled power outages affecting approximately 225,000 customers. "
                "The attackers utilized spearphishing emails with malicious Microsoft Office documents to drop BlackEnergy 3 malware, "
                "followed by KillDisk to overwrite master boot records and disable uninterruptible power supplies (UPS). "
                "The attack is linked to the threat group Sandworm Team."
            ),
            "is_syndicated": 0,
            "canonical_source_id": None
        },
        {
            "id": "doc_mandiant_notpetya_2017",
            "title": "NotPetya: A Rapid-Spreading Destructive Wiper Masquerading as Ransomware",
            "source_name": "FireEye / Mandiant",
            "source_url": "https://www.mandiant.com/resources/notpetya-ransomware-or-wiper",
            "source_type": "threat_report",
            "publication_time": "2017-06-29T10:00:00Z",
            "observation_time": "2017-06-27T08:00:00Z",
            "reliability_tier": "commercial_threat_intel",
            "raw_content": (
                "On June 27, 2017, an outbreak initially identified as Petya ransomware struck Ukrainian government, banking, and energy organizations. "
                "Technical analysis indicates the malware is not designed for financial extortion; the encryption key is intentionally discarded after payload execution. "
                "Initial distribution occurred through a backdoored software update for MeDoc, Ukraine's widely used tax accounting package. "
                "The malware automatically spreads via EternalBlue (MS17-010) and PsExec, wiping disk sectors irreversibly."
            ),
            "is_syndicated": 0,
            "canonical_source_id": None
        },
        {
            "id": "doc_doj_sandworm_indictment_2020",
            "title": "Six Russian GRU Officers Charged in Connection with Worldwide Cyber Attacks Including NotPetya and Olympic Destroyer",
            "source_name": "US Department of Justice",
            "source_url": "https://www.justice.gov/opa/pr/six-russian-gru-officers-charged",
            "source_type": "legal_indictment",
            "publication_time": "2020-10-19T17:00:00Z",
            "observation_time": "2020-09-01T00:00:00Z",
            "reliability_tier": "verified_official",
            "raw_content": (
                "A federal grand jury in Pittsburgh returned an indictment charging six military officers in Unit 74455 of the Russian Main Intelligence Directorate (GRU). "
                "The defendants, members of the group known in the security industry as Sandworm Team, Voodoo Bear, and TeleBots, "
                "unleashed the devastating NotPetya malware on June 27, 2017, and conducted destructive cyber attacks against Ukraine's electric power grid in December 2015 and December 2016. "
                "The indictment confirms that Sandworm operated under direct orders of GRU military intelligence."
            ),
            "is_syndicated": 0,
            "canonical_source_id": None
        },

        # --- Lazarus / Ronin Case ---
        {
            "id": "doc_sky_mavis_ronin_breach_2022",
            "title": "Community Alert: Ronin Validator Nodes Compromised for 173,600 ETH and 25.5M USDC",
            "source_name": "Sky Mavis Security",
            "source_url": "https://roninblockchain.substack.com/p/community-alert-ronin-validators",
            "source_type": "threat_report",
            "publication_time": "2022-03-29T14:00:00Z",
            "observation_time": "2022-03-23T11:24:00Z",
            "reliability_tier": "commercial_threat_intel",
            "raw_content": (
                "Earlier today, Sky Mavis discovered that on March 23, 2022, five validator private keys were compromised "
                "(four Sky Mavis validators and one third-party Axie DAO validator). "
                "The attacker used the compromised signature quorum to forge unauthorized withdrawal transactions, "
                "draining 173,600 Ethereum and 25.5 Million USDC from the Ronin bridge smart contract. "
                "We are actively coordinating with chain forensics experts and federal law enforcement."
            ),
            "is_syndicated": 0,
            "canonical_source_id": None
        },
        {
            "id": "doc_fbi_ofac_lazarus_ronin_2022",
            "title": "FBI and OFAC Attribute $620 Million Ronin Bridge Theft to DPRK State-Sponsored Lazarus Group",
            "source_name": "US Department of Treasury / FBI",
            "source_url": "https://home.treasury.gov/news/press-releases/jy0715",
            "source_type": "verified_official",
            "publication_time": "2022-04-14T16:00:00Z",
            "observation_time": "2022-04-10T00:00:00Z",
            "reliability_tier": "verified_official",
            "raw_content": (
                "The Federal Bureau of Investigation (FBI) and the Department of the Treasury's Office of Foreign Assets Control (OFAC) "
                "officially attribute the March 2022 exploitation of the Ronin Network bridge to the Lazarus Group (also known as APT38 and Hidden Cobra), "
                "a cyber threat actor sponsored by the Democratic People's Republic of Korea (DPRK). "
                "OFAC has added the primary Ethereum deposit address used by the actors to the Specially Designated Nationals (SDN) list to block further laundering."
            ),
            "is_syndicated": 0,
            "canonical_source_id": None
        },

        # --- Pegasus / NSO Group Case ---
        {
            "id": "doc_citizenlab_mansoor_2016",
            "title": "The Million Dollar Dissident: NSO Group's iPhone Zero-Days Used Against UAE Human Rights Defender",
            "source_name": "Citizen Lab",
            "source_url": "https://citizenlab.ca/2016/08/million-dollar-dissident",
            "source_type": "technical_paper",
            "publication_time": "2016-08-24T12:00:00Z",
            "observation_time": "2016-08-10T14:00:00Z",
            "reliability_tier": "independent_research",
            "raw_content": (
                "Citizen Lab, in collaboration with Lookout Security, analyzed targeted SMS text messages received by human rights defender Ahmed Mansoor. "
                "Clicking the link triggered an unprecedented chain of three iOS zero-day vulnerabilities (CVE-2016-4655, CVE-2016-4656, CVE-2016-4657), dubbed 'Trident'. "
                "The exploit chain silently jailbroke the iPhone and installed sophisticated surveillance software attributed to Israel-based NSO Group, known as Pegasus Spyware. "
                "Pegasus can intercept calls, steal WhatsApp messages, capture keystrokes, and track device locations in real time."
            ),
            "is_syndicated": 0,
            "canonical_source_id": None
        },
        {
            "id": "doc_commerce_nso_entity_list_2021",
            "title": "Commerce Department Adds NSO Group to Entity List for Malicious Cyber Activities",
            "source_name": "US Department of Commerce",
            "source_url": "https://www.bis.doc.gov/index.php/documents/about-bis/newsroom/press-releases/2863-2021-11-03-commerce-adds-nso-group-to-entity-list",
            "source_type": "advisory",
            "publication_time": "2021-11-03T13:00:00Z",
            "observation_time": "2021-10-01T00:00:00Z",
            "reliability_tier": "verified_official",
            "raw_content": (
                "The Bureau of Industry and Security (BIS) has amended the Export Administration Regulations to add NSO Group and Candiru to the Entity List. "
                "These entities developed and supplied spyware to foreign governments that used these tools to maliciously target government officials, "
                "journalists, businesspeople, activists, academics, and embassy workers. "
                "The proliferation of tools like Pegasus Spyware enables foreign governments to conduct transnational repression."
            ),
            "is_syndicated": 0,
            "canonical_source_id": None
        },

        # --- Stuxnet Case ---
        {
            "id": "doc_symantec_stuxnet_dossier_2010",
            "title": "W32.Stuxnet Dossier: Analysis of a Target-Specific Industrial Control System Worm",
            "source_name": "Symantec Security Response",
            "source_url": "https://www.symantec.com/content/en/us/enterprise/media/security_response/whitepapers/w32_stuxnet_dossier.pdf",
            "source_type": "technical_paper",
            "publication_time": "2010-11-12T15:00:00Z",
            "observation_time": "2010-06-17T08:00:00Z",
            "reliability_tier": "commercial_threat_intel",
            "raw_content": (
                "Stuxnet is a computer worm that targets industrial control systems primarily in Iran. "
                "It spreads via multiple zero-day vulnerabilities, including MS10-046 (.LNK file vulnerability) and network shares. "
                "Unlike ordinary malware, Stuxnet contains custom code designed specifically to inspect and reprogram Programmable Logic Controllers (PLCs) "
                "running Siemens Step7 software. It alters the rotational frequency of variable frequency drives manufactured by Fararo Paya and Vacon, "
                "matching the exact operational parameters of uranium enrichment centrifuge cascades at the Natanz Uranium Enrichment Plant."
            ),
            "is_syndicated": 0,
            "canonical_source_id": None
        },
        {
            "id": "doc_nyt_sanger_olympic_games_2012",
            "title": "Obama Order Sped Up Wave of Cyberattacks Against Iran Nuclear Centrifuges",
            "source_name": "The New York Times",
            "source_url": "https://www.nytimes.com/2012/06/01/world/middleeast/obama-ordered-wave-of-cyberattacks-against-iran.html",
            "source_type": "news_report",
            "publication_time": "2012-06-01T04:00:00Z",
            "observation_time": "2012-05-15T00:00:00Z",
            "reliability_tier": "journalism",
            "raw_content": (
                "From his first months in office, President Obama secretly ordered increasingly sophisticated attacks on the computer systems that run Iran's main nuclear enrichment facilities. "
                "The operation, code-named Olympic Games, was initiated under President George W. Bush and accelerated under Obama, "
                "marking the first sustained use of cyberweapons by the United States against another nation's physical infrastructure. "
                "The core component, Stuxnet, successfully crippled roughly 1,000 centrifuges at the Natanz Uranium Enrichment Plant before escaping onto the internet due to a programming error."
            ),
            "is_syndicated": 0,
            "canonical_source_id": None
        }
    ]

    for doc in docs_data:
        c_hash = compute_sha256(doc["raw_content"])
        s_hash = compute_simhash(doc["raw_content"])
        w_count = len(doc["raw_content"].split())

        conn.execute(
            """
            INSERT INTO documents (
                id, title, source_name, source_url, source_type,
                publication_time, observation_time, ingestion_time,
                raw_content, content_hash, simhash, is_syndicated,
                canonical_source_id, reliability_tier, word_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                doc["id"], doc["title"], doc["source_name"], doc["source_url"], doc["source_type"],
                doc["publication_time"], doc["observation_time"], now,
                doc["raw_content"], c_hash, s_hash, doc["is_syndicated"],
                doc["canonical_source_id"], doc["reliability_tier"], w_count
            )
        )

        # Create passages and FTS5 entries
        pas_id = f"pas_{doc['id']}"
        conn.execute(
            """
            INSERT INTO passages (
                id, document_id, passage_index, text, passage_hash, entity_mentions, claims_count, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (pas_id, doc["id"], 0, doc["raw_content"], c_hash, "[]", 2, now)
        )
        conn.execute(
            """
            INSERT INTO fts_passages (
                passage_id, document_id, document_title, source_name, passage_text
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (pas_id, doc["id"], doc["title"], doc["source_name"], doc["raw_content"])
        )

    # ==========================================
    # 3. HISTORICAL EVENTS
    # ==========================================
    events_data = [
        {
            "id": "ev_solarwinds_insertion",
            "title": "SUNBURST Backdoor Injected into SolarWinds Orion Software Build",
            "description": "APT29 infiltrated SolarWinds internal build pipeline and inserted malicious trojan code into signed Orion releases.",
            "event_time_start": "2020-03-24T10:00:00Z",
            "event_time_end": "2020-05-15T00:00:00Z",
            "first_reported_time": "2020-12-13T18:00:00Z",
            "observation_time": "2020-12-08T09:00:00Z",
            "event_type": "compromise",
            "certainty": "confirmed",
            "primary_entity_id": "ent_apt29",
            "target_entity_id": "ent_solarwinds",
            "document_id": "doc_fireeye_2020",
            "passage_id": "pas_doc_fireeye_2020"
        },
        {
            "id": "ev_solarwinds_attribution",
            "title": "US Intelligence Attributed SolarWinds Supply Chain Breach to Russian SVR",
            "description": "CISA, FBI, and NSA jointly consolidated UNC2452 into Russian Foreign Intelligence Service (SVR / APT29).",
            "event_time_start": "2021-04-15T12:00:00Z",
            "event_time_end": None,
            "first_reported_time": "2021-04-15T12:00:00Z",
            "observation_time": "2021-01-05T00:00:00Z",
            "event_type": "attribution",
            "certainty": "confirmed",
            "primary_entity_id": "ent_apt29",
            "target_entity_id": "ent_solarwinds",
            "document_id": "doc_cisa_aa21_008a",
            "passage_id": "pas_doc_cisa_aa21_008a"
        },
        {
            "id": "ev_msft_blizzard_breach",
            "title": "Midnight Blizzard Breached Microsoft Leadership Email Accounts",
            "description": "Russian SVR actors conducted password spray attacks on legacy test tenants to compromise Microsoft corporate email.",
            "event_time_start": "2023-11-20T00:00:00Z",
            "event_time_end": "2024-01-12T00:00:00Z",
            "first_reported_time": "2024-01-19T21:00:00Z",
            "observation_time": "2024-01-12T10:00:00Z",
            "event_type": "breach",
            "certainty": "confirmed",
            "primary_entity_id": "ent_apt29",
            "target_entity_id": None,
            "document_id": "doc_msft_midnight_blizzard_2024",
            "passage_id": "pas_doc_msft_midnight_blizzard_2024"
        },
        {
            "id": "ev_ukraine_blackout_2015",
            "title": "Ukrainian Power Grid Blackout via BlackEnergy 3",
            "description": "Sandworm compromised Kyivoblenergo substations, plunging 225,000 residents into darkness in winter.",
            "event_time_start": "2015-12-23T15:30:00Z",
            "event_time_end": "2015-12-23T21:00:00Z",
            "first_reported_time": "2016-02-25T14:00:00Z",
            "observation_time": "2015-12-23T15:30:00Z",
            "event_type": "compromise",
            "certainty": "confirmed",
            "primary_entity_id": "ent_sandworm",
            "target_entity_id": None,
            "document_id": "doc_cisa_ukraine_grid_2016",
            "passage_id": "pas_doc_cisa_ukraine_grid_2016"
        },
        {
            "id": "ev_notpetya_outbreak_2017",
            "title": "Global NotPetya Cyber Weapon Outbreak",
            "description": "Sandworm deployed destructive NotPetya wiper via MeDoc updates, destroying systems across Maersk, Merck, and worldwide logistics.",
            "event_time_start": "2017-06-27T08:00:00Z",
            "event_time_end": "2017-06-28T00:00:00Z",
            "first_reported_time": "2017-06-29T10:00:00Z",
            "observation_time": "2017-06-27T08:00:00Z",
            "event_type": "breach",
            "certainty": "confirmed",
            "primary_entity_id": "ent_sandworm",
            "target_entity_id": None,
            "document_id": "doc_mandiant_notpetya_2017",
            "passage_id": "pas_doc_mandiant_notpetya_2017"
        },
        {
            "id": "ev_ronin_heist_2022",
            "title": "Axie Infinity Ronin Bridge $620 Million Crypto Exploitation",
            "description": "Lazarus Group stole five validator private keys and forged unauthorized transactions draining 173,600 ETH and 25.5M USDC.",
            "event_time_start": "2022-03-23T11:24:00Z",
            "event_time_end": "2022-03-23T12:00:00Z",
            "first_reported_time": "2022-03-29T14:00:00Z",
            "observation_time": "2022-03-23T11:24:00Z",
            "event_type": "breach",
            "certainty": "confirmed",
            "primary_entity_id": "ent_lazarus",
            "target_entity_id": "ent_ronin",
            "document_id": "doc_sky_mavis_ronin_breach_2022",
            "passage_id": "pas_doc_sky_mavis_ronin_breach_2022"
        },
        {
            "id": "ev_pegasus_mansoor_disclosure",
            "title": "Citizen Lab Unveiled Trident iOS Zero-Days and Pegasus Spyware",
            "description": "First public forensic proof linking NSO Group Pegasus spyware to zero-day targeting of human rights activists.",
            "event_time_start": "2016-08-10T14:00:00Z",
            "event_time_end": "2016-08-24T12:00:00Z",
            "first_reported_time": "2016-08-24T12:00:00Z",
            "observation_time": "2016-08-10T14:00:00Z",
            "event_type": "disclosure",
            "certainty": "confirmed",
            "primary_entity_id": "ent_nso_group",
            "target_entity_id": "ent_pegasus",
            "document_id": "doc_citizenlab_mansoor_2016",
            "passage_id": "pas_doc_citizenlab_mansoor_2016"
        },
        {
            "id": "ev_stuxnet_natanz_sabotage",
            "title": "Stuxnet Sabotaged IR-1 Centrifuges at Natanz Nuclear Facility",
            "description": "Operation Olympic Games worm altered variable frequency drives at Natanz, physically destroying ~1,000 uranium enrichment centrifuges.",
            "event_time_start": "2009-11-01T00:00:00Z",
            "event_time_end": "2010-06-01T00:00:00Z",
            "first_reported_time": "2010-11-12T15:00:00Z",
            "observation_time": "2010-06-17T08:00:00Z",
            "event_type": "compromise",
            "certainty": "confirmed",
            "primary_entity_id": "ent_stuxnet",
            "target_entity_id": "ent_natanz",
            "document_id": "doc_symantec_stuxnet_dossier_2010",
            "passage_id": "pas_doc_symantec_stuxnet_dossier_2010"
        }
    ]

    for ev in events_data:
        conn.execute(
            """
            INSERT INTO events (
                id, title, description, event_time_start, event_time_end,
                first_reported_time, observation_time, ingestion_time,
                event_type, certainty, primary_entity_id, target_entity_id,
                document_id, passage_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                ev["id"], ev["title"], ev["description"], ev["event_time_start"], ev["event_time_end"],
                ev["first_reported_time"], ev["observation_time"], now,
                ev["event_type"], ev["certainty"], ev["primary_entity_id"], ev["target_entity_id"],
                ev["document_id"], ev["passage_id"]
            )
        )

    # ==========================================
    # 4. CLAIMS & HISTORICAL CLAIM REVISIONS
    # ==========================================
    claims_data = [
        # Claim 1: Initial SolarWinds attribution (Unresolved hypothesis in Dec 2020)
        {
            "id": "clm_unc2452_solarwinds",
            "document_id": "doc_fireeye_2020",
            "passage_id": "pas_doc_fireeye_2020",
            "subject_entity_id": "ent_apt29",
            "predicate": "DEPLOYS",
            "object_entity_id": "ent_sunburst",
            "object_literal": "SUNBURST backdoor",
            "claim_text": "Actor UNC2452 inserted the SUNBURST backdoor into SolarWinds Orion software builds.",
            "status": "refuted_or_superseded", # Initially source_reported, superseded by official attribution!
            "certainty_tier": "medium",
            "confidence_score": 0.75,
            "publication_time": "2020-12-13T18:00:00Z",
            "alleged_event_time": "2020-03-24T10:00:00Z",
            "observation_time": "2020-12-08T09:00:00Z",
            "superseded_by_claim_id": "clm_apt29_official_cisa",
            "contradiction_reason": "Attributed to temporary tracking cluster UNC2452; superseded by formal US Government attribution to SVR / APT29 on 2021-04-15."
        },
        # Claim 2: Formal Russian SVR attribution (Verified fact in April 2021)
        {
            "id": "clm_apt29_official_cisa",
            "document_id": "doc_cisa_aa21_008a",
            "passage_id": "pas_doc_cisa_aa21_008a",
            "subject_entity_id": "ent_apt29",
            "predicate": "ATTRIBUTED_TO",
            "object_entity_id": "ent_solarwinds",
            "object_literal": "Russian Foreign Intelligence Service SVR",
            "claim_text": "The Russian Foreign Intelligence Service (SVR / APT29) is the perpetrator of the SolarWinds Orion supply chain compromise.",
            "status": "verified_fact",
            "certainty_tier": "high",
            "confidence_score": 0.99,
            "publication_time": "2021-04-15T12:00:00Z",
            "alleged_event_time": "2020-03-24T10:00:00Z",
            "observation_time": "2021-01-05T00:00:00Z",
            "superseded_by_claim_id": None,
            "contradiction_reason": None
        },
        # Claim 3: NotPetya ransomware vs wiper (Contradiction / Refutation)
        {
            "id": "clm_notpetya_ransomware_original",
            "document_id": "doc_mandiant_notpetya_2017",
            "passage_id": "pas_doc_mandiant_notpetya_2017",
            "subject_entity_id": "ent_notpetya",
            "predicate": "VARIANT_OF",
            "object_entity_id": None,
            "object_literal": "Petya Ransomware",
            "claim_text": "Initial reporting categorized NotPetya as a financial cybercrime ransomware outbreak seeking Bitcoin payments.",
            "status": "refuted_or_superseded",
            "certainty_tier": "low",
            "confidence_score": 0.40,
            "publication_time": "2017-06-27T12:00:00Z",
            "alleged_event_time": "2017-06-27T08:00:00Z",
            "observation_time": "2017-06-27T08:00:00Z",
            "superseded_by_claim_id": "clm_notpetya_wiper_mandiant",
            "contradiction_reason": "Forensics proved the encryption key was discarded; it was a military wiper rather than ransomware."
        },
        {
            "id": "clm_notpetya_wiper_mandiant",
            "document_id": "doc_mandiant_notpetya_2017",
            "passage_id": "pas_doc_mandiant_notpetya_2017",
            "subject_entity_id": "ent_sandworm",
            "predicate": "DEPLOYS",
            "object_entity_id": "ent_notpetya",
            "object_literal": "Destructive Military Wiper",
            "claim_text": "Sandworm deployed NotPetya as a destructive wiper using MeDoc accounting software updates as a supply chain conduit.",
            "status": "verified_fact",
            "certainty_tier": "high",
            "confidence_score": 0.98,
            "publication_time": "2017-06-29T10:00:00Z",
            "alleged_event_time": "2017-06-27T08:00:00Z",
            "observation_time": "2017-06-27T08:00:00Z",
            "superseded_by_claim_id": None,
            "contradiction_reason": None
        },
        # Claim 4: Ronin Bridge Lazarus Attribution
        {
            "id": "clm_lazarus_ronin_fbi",
            "document_id": "doc_fbi_ofac_lazarus_ronin_2022",
            "passage_id": "pas_doc_fbi_ofac_lazarus_ronin_2022",
            "subject_entity_id": "ent_lazarus",
            "predicate": "TARGETS",
            "object_entity_id": "ent_ronin",
            "object_literal": "Sky Mavis Ronin Bridge",
            "claim_text": "Lazarus Group (APT38) compromised five validator nodes to steal $620 million in cryptocurrency from Ronin Network.",
            "status": "verified_fact",
            "certainty_tier": "high",
            "confidence_score": 0.99,
            "publication_time": "2022-04-14T16:00:00Z",
            "alleged_event_time": "2022-03-23T11:24:00Z",
            "observation_time": "2022-04-10T00:00:00Z",
            "superseded_by_claim_id": None,
            "contradiction_reason": None
        },
        # Claim 5: Pegasus Developed by NSO Group
        {
            "id": "clm_pegasus_nso_dev",
            "document_id": "doc_citizenlab_mansoor_2016",
            "passage_id": "pas_doc_citizenlab_mansoor_2016",
            "subject_entity_id": "ent_nso_group",
            "predicate": "DEPLOYS",
            "object_entity_id": "ent_pegasus",
            "object_literal": "Pegasus Spyware",
            "claim_text": "NSO Group developed and distributed Pegasus Spyware to target human rights activists using Trident iOS zero-days.",
            "status": "verified_fact",
            "certainty_tier": "high",
            "confidence_score": 0.98,
            "publication_time": "2016-08-24T12:00:00Z",
            "alleged_event_time": "2016-08-10T14:00:00Z",
            "observation_time": "2016-08-10T14:00:00Z",
            "superseded_by_claim_id": None,
            "contradiction_reason": None
        },
        # Claim 6: Stuxnet Sabotage of Natanz
        {
            "id": "clm_stuxnet_natanz_sabotage",
            "document_id": "doc_symantec_stuxnet_dossier_2010",
            "passage_id": "pas_doc_symantec_stuxnet_dossier_2010",
            "subject_entity_id": "ent_stuxnet",
            "predicate": "TARGETS",
            "object_entity_id": "ent_natanz",
            "object_literal": "Siemens S7-300 PLCs and Centrifuges",
            "claim_text": "Stuxnet selectively altered the rotational speed of frequency converter drives operating IR-1 centrifuges at Natanz.",
            "status": "verified_fact",
            "certainty_tier": "high",
            "confidence_score": 0.97,
            "publication_time": "2010-11-12T15:00:00Z",
            "alleged_event_time": "2009-11-01T00:00:00Z",
            "observation_time": "2010-06-17T08:00:00Z",
            "superseded_by_claim_id": None,
            "contradiction_reason": None
        }
    ]

    for c in claims_data:
        conn.execute(
            """
            INSERT INTO claims (
                id, document_id, passage_id, subject_entity_id, predicate,
                object_entity_id, object_literal, claim_text, status,
                certainty_tier, confidence_score, publication_time, alleged_event_time,
                observation_time, superseded_by_claim_id, contradiction_reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                c["id"], c["document_id"], c["passage_id"], c["subject_entity_id"], c["predicate"],
                c["object_entity_id"], c["object_literal"], c["claim_text"], c["status"],
                c["certainty_tier"], c["confidence_score"], c["publication_time"], c["alleged_event_time"],
                c["observation_time"], c["superseded_by_claim_id"], c["contradiction_reason"]
            )
        )

    # Claim revisions (demonstrating versioning & historical preservation)
    revisions_data = [
        {
            "id": "rev_unc2452_to_apt29",
            "claim_id": "clm_unc2452_solarwinds",
            "revision_number": 2,
            "prior_status": "source_reported",
            "new_status": "refuted_or_superseded",
            "prior_confidence": 0.75,
            "new_confidence": 0.30,
            "revision_reason": "Consolidated into formal attribution of Russian SVR / APT29 per CISA Advisory AA21-008A.",
            "evidence_document_id": "doc_cisa_aa21_008a",
            "revised_at": "2021-04-15T12:00:00Z"
        },
        {
            "id": "rev_notpetya_ransom_to_wiper",
            "claim_id": "clm_notpetya_ransomware_original",
            "revision_number": 2,
            "prior_status": "unresolved_hypothesis",
            "new_status": "refuted_or_superseded",
            "prior_confidence": 0.60,
            "new_confidence": 0.05,
            "revision_reason": "Technical forensics confirmed malware permanently destroys master file tables without decryption capability.",
            "evidence_document_id": "doc_mandiant_notpetya_2017",
            "revised_at": "2017-06-29T10:00:00Z"
        }
    ]

    for rev in revisions_data:
        conn.execute(
            """
            INSERT INTO claim_revisions (
                id, claim_id, revision_number, prior_status, new_status,
                prior_confidence, new_confidence, revision_reason,
                evidence_document_id, revised_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rev["id"], rev["claim_id"], rev["revision_number"], rev["prior_status"], rev["new_status"],
                rev["prior_confidence"], rev["new_confidence"], rev["revision_reason"],
                rev["evidence_document_id"], rev["revised_at"]
            )
        )

    # ==========================================
    # 5. RELATIONSHIPS & EVIDENCE EXCERPTS
    # ==========================================
    relationships_data = [
        {
            "id": "rel_apt29_deploys_sunburst",
            "source_entity_id": "ent_apt29",
            "target_entity_id": "ent_sunburst",
            "relation_type": "DEPLOYS",
            "status": "verified",
            "confidence_score": 0.99,
            "first_observed_time": "2020-03-24T10:00:00Z",
            "last_observed_time": "2021-04-15T12:00:00Z",
            "independent_sources_count": 3,
            "is_contested": 0,
            "notes": "SUNBURST backdoor trojanized into SolarWinds Orion signed updates.",
            "evidence": [
                ("doc_fireeye_2020", "pas_doc_fireeye_2020", "The actor inserted a backdoor into software updates of the SolarWinds Orion IT performance monitoring application.", "2020-12-13T18:00:00Z", 0.95),
                ("doc_cisa_aa21_008a", "pas_doc_cisa_aa21_008a", "The SVR actor used SUNBURST and subsequent TEARDROP droppers to bypass MFA and forge SAML tokens.", "2021-04-15T12:00:00Z", 0.99)
            ]
        },
        {
            "id": "rel_apt29_targets_solarwinds",
            "source_entity_id": "ent_apt29",
            "target_entity_id": "ent_solarwinds",
            "relation_type": "TARGETS",
            "status": "verified",
            "confidence_score": 0.99,
            "first_observed_time": "2020-03-24T10:00:00Z",
            "last_observed_time": "2021-04-15T12:00:00Z",
            "independent_sources_count": 3,
            "is_contested": 0,
            "notes": "Supply chain compromise of software build pipeline.",
            "evidence": [
                ("doc_cisa_aa21_008a", "pas_doc_cisa_aa21_008a", "CISA formally identifies the Russian Foreign Intelligence Service (SVR), also known as APT29, as the perpetrator of the SolarWinds Orion supply chain compromise.", "2021-04-15T12:00:00Z", 0.99)
            ]
        },
        {
            "id": "rel_sandworm_deploys_notpetya",
            "source_entity_id": "ent_sandworm",
            "target_entity_id": "ent_notpetya",
            "relation_type": "DEPLOYS",
            "status": "verified",
            "confidence_score": 0.98,
            "first_observed_time": "2017-06-27T08:00:00Z",
            "last_observed_time": "2020-10-19T17:00:00Z",
            "independent_sources_count": 2,
            "is_contested": 0,
            "notes": "Destructive wiper deployed via Ukrainian accounting software update.",
            "evidence": [
                ("doc_doj_sandworm_indictment_2020", "pas_doc_doj_sandworm_indictment_2020", "The defendants, members of Sandworm Team in Unit 74455 of the Russian GRU, unleashed the devastating NotPetya malware on June 27, 2017.", "2020-10-19T17:00:00Z", 0.99),
                ("doc_mandiant_notpetya_2017", "pas_doc_mandiant_notpetya_2017", "Initial distribution occurred through a backdoored software update for MeDoc, Ukraine's widely used tax accounting package.", "2017-06-29T10:00:00Z", 0.96)
            ]
        },
        {
            "id": "rel_lazarus_targets_ronin",
            "source_entity_id": "ent_lazarus",
            "target_entity_id": "ent_ronin",
            "relation_type": "TARGETS",
            "status": "verified",
            "confidence_score": 0.99,
            "first_observed_time": "2022-03-23T11:24:00Z",
            "last_observed_time": "2022-04-14T16:00:00Z",
            "independent_sources_count": 2,
            "is_contested": 0,
            "notes": "Theft of $620 million in ETH/USDC from crypto cross-chain bridge.",
            "evidence": [
                ("doc_fbi_ofac_lazarus_ronin_2022", "pas_doc_fbi_ofac_lazarus_ronin_2022", "The FBI and OFAC officially attribute the March 2022 exploitation of the Ronin Network bridge to the Lazarus Group (APT38).", "2022-04-14T16:00:00Z", 0.99),
                ("doc_sky_mavis_ronin_breach_2022", "pas_doc_sky_mavis_ronin_breach_2022", "The attacker used the compromised signature quorum to forge unauthorized withdrawal transactions, draining 173,600 Ethereum and 25.5 Million USDC.", "2022-03-29T14:00:00Z", 0.94)
            ]
        },
        {
            "id": "rel_nso_deploys_pegasus",
            "source_entity_id": "ent_nso_group",
            "target_entity_id": "ent_pegasus",
            "relation_type": "DEPLOYS",
            "status": "verified",
            "confidence_score": 0.99,
            "first_observed_time": "2016-08-10T14:00:00Z",
            "last_observed_time": "2021-11-03T13:00:00Z",
            "independent_sources_count": 2,
            "is_contested": 0,
            "notes": "Commercial mobile surveillance spyware.",
            "evidence": [
                ("doc_citizenlab_mansoor_2016", "pas_doc_citizenlab_mansoor_2016", "The exploit chain silently jailbroke the iPhone and installed sophisticated surveillance software attributed to Israel-based NSO Group, known as Pegasus Spyware.", "2016-08-24T12:00:00Z", 0.98),
                ("doc_commerce_nso_entity_list_2021", "pas_doc_commerce_nso_entity_list_2021", "The proliferation of tools like Pegasus Spyware enables foreign governments to conduct transnational repression.", "2021-11-03T13:00:00Z", 0.99)
            ]
        },
        {
            "id": "rel_stuxnet_targets_natanz",
            "source_entity_id": "ent_stuxnet",
            "target_entity_id": "ent_natanz",
            "relation_type": "TARGETS",
            "status": "verified",
            "confidence_score": 0.98,
            "first_observed_time": "2009-11-01T00:00:00Z",
            "last_observed_time": "2012-06-01T04:00:00Z",
            "independent_sources_count": 2,
            "is_contested": 0,
            "notes": "Targeted physical destruction of uranium centrifuges.",
            "evidence": [
                ("doc_symantec_stuxnet_dossier_2010", "pas_doc_symantec_stuxnet_dossier_2010", "It alters the rotational frequency of variable frequency drives, matching the exact operational parameters of uranium enrichment centrifuge cascades at Natanz.", "2010-11-12T15:00:00Z", 0.98),
                ("doc_nyt_sanger_olympic_games_2012", "pas_doc_nyt_sanger_olympic_games_2012", "The core component, Stuxnet, successfully crippled roughly 1,000 centrifuges at the Natanz Uranium Enrichment Plant.", "2012-06-01T04:00:00Z", 0.95)
            ]
        }
    ]

    for rel in relationships_data:
        conn.execute(
            """
            INSERT INTO relationships (
                id, source_entity_id, target_entity_id, relation_type,
                status, confidence_score, first_observed_time, last_observed_time,
                independent_sources_count, is_contested, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rel["id"], rel["source_entity_id"], rel["target_entity_id"], rel["relation_type"],
                rel["status"], rel["confidence_score"], rel["first_observed_time"], rel["last_observed_time"],
                rel["independent_sources_count"], rel["is_contested"], rel["notes"]
            )
        )
        for doc_id, pas_id, quote, pub_time, conf in rel["evidence"]:
            ev_id = f"rev_{uuid.uuid4().hex[:8]}"
            conn.execute(
                """
                INSERT INTO relationship_evidence (
                    id, relationship_id, document_id, passage_id, verbatim_quote, publication_time, confidence_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (ev_id, rel["id"], doc_id, pas_id, quote, pub_time, conf)
            )

    # ==========================================
    # 6. DEFAULT CASE WORKSPACE & BOOKMARKED EVIDENCE
    # ==========================================
    ws_id = "ws_solarwinds_investigation"
    conn.execute(
        """
        INSERT INTO workspaces (id, title, description, analyst_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            ws_id,
            "Project SolarWinds: SVR Supply Chain Reconstruction",
            "Forensic dossier tracking the attribution and technical evolution of the SolarWinds Orion build system compromise by Russian SVR (APT29 / Midnight Blizzard).",
            "Lead Temporal Analyst",
            now,
            now
        )
    )

    pinned_items = [
        ("wi_1", ws_id, "entity", "ent_apt29", now, "Primary threat actor cluster. Note alias unification from UNC2452 -> SVR.", "supports_hypothesis"),
        ("wi_2", ws_id, "entity", "ent_sunburst", now, "Trojanized DLL injected into SolarWinds build pipeline.", "supports_hypothesis"),
        ("wi_3", ws_id, "claim", "clm_unc2452_solarwinds", now, "Initial December 2020 hypothesis superseded by CISA AA21-008A formal attribution.", "refutes_hypothesis"),
        ("wi_4", ws_id, "event", "ev_solarwinds_insertion", now, "Build injection occurred March-May 2020 but went undetected until Dec 2020 (8 months latency).", "supports_hypothesis")
    ]
    for it in pinned_items:
        conn.execute(
            """
            INSERT INTO workspace_items (id, workspace_id, item_type, item_id, pinned_at, analyst_note, hypothesis_stance)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            it
        )

    notes = [
        ("wn_1", ws_id, "Hypothesis 1: Operational Continuity from 2020 to 2024", "Evidence indicates SVR has transitioned from high-risk supply-chain injections (SUNBURST) to targeting non-production test tenants with password sprays (Midnight Blizzard 2024).", now),
        ("wn_2", ws_id, "Temporal Latency Analysis", "Notice the 8-month gap between initial compromise in March 2020 and public disclosure in December 2020. Wire syndicates immediately reprinted FireEye's advisory without new telemetry.", now)
    ]
    for n in notes:
        conn.execute(
            """
            INSERT INTO workspace_notes (id, workspace_id, title, content, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            n
        )

    conn.execute("PRAGMA foreign_keys = ON;")
    conn.commit()
    return {
        "status": "seeded",
        "entities_count": len(entities_data),
        "documents_count": len(docs_data),
        "events_count": len(events_data),
        "claims_count": len(claims_data),
        "relationships_count": len(relationships_data)
    }
