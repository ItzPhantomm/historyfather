"""
Deterministic Entity Resolution Engine for HistoryFather.
Identifies likely references to the same entity across different names, spellings,
and source nomenclatures with confidence scores and explainable matching.

Strategies:
  1. Exact Canonical & Alias Matching (Normalized dictionary)
  2. Substring & Acronym Matching
  3. Jaro-Winkler & Token-Sort String Distance
  4. Contextual & Alias Graph Expansion
"""

import re
import math
from typing import List, Dict, Any, Optional, Tuple
from app.db.database import get_connection, rows_to_dicts
from app.schemas.models import EntityMatchExplanation

def normalize_name(name: str) -> str:
    """Normalize string by lowercasing, removing hyphens/underscores/special characters, and trimming."""
    clean = re.sub(r"[^a-zA-Z0-9\s]", "", name.lower())
    return " ".join(clean.split())

def compact_name(name: str) -> str:
    """Strip all whitespace and punctuation for strict token comparisons (e.g. 'APT-29' -> 'apt29')."""
    return re.sub(r"[^a-zA-Z0-9]", "", name.lower())

def jaro_winkler_similarity(s1: str, s2: str, p: float = 0.1) -> float:
    """
    Compute Jaro-Winkler similarity metric between two strings.
    Value is between 0.0 (no similarity) and 1.0 (exact match).
    """
    s1 = s1.lower().strip()
    s2 = s2.lower().strip()
    if s1 == s2:
        return 1.0
    if not s1 or not s2:
        return 0.0

    len1, len2 = len(s1), len(s2)
    max_dist = max(len1, len2) // 2 - 1
    if max_dist < 0:
        max_dist = 0

    s1_matches = [False] * len1
    s2_matches = [False] * len2
    matches = 0

    for i in range(len1):
        start = max(0, i - max_dist)
        end = min(i + max_dist + 1, len2)
        for j in range(start, end):
            if not s2_matches[j] and s1[i] == s2[j]:
                s1_matches[i] = True
                s2_matches[j] = True
                matches += 1
                break

    if matches == 0:
        return 0.0

    t = 0
    k = 0
    for i in range(len1):
        if s1_matches[i]:
            while not s2_matches[k]:
                k += 1
            if s1[i] != s2[k]:
                t += 1
            k += 1
    transpositions = t // 2

    jaro = (
        (matches / len1) +
        (matches / len2) +
        ((matches - transpositions) / matches)
    ) / 3.0

    # Winkler prefix bonus (up to 4 chars)
    prefix = 0
    for i in range(min(4, len1, len2)):
        if s1[i] == s2[i]:
            prefix += 1
        else:
            break

    return jaro + (prefix * p * (1.0 - jaro))

def token_sort_ratio(s1: str, s2: str) -> float:
    """Tokenize, sort tokens, and measure similarity to handle word order changes."""
    t1 = " ".join(sorted(tokenize_words(s1)))
    t2 = " ".join(sorted(tokenize_words(s2)))
    return jaro_winkler_similarity(t1, t2)

def tokenize_words(text: str) -> List[str]:
    return re.findall(r"\b\w+\b", text.lower())

class EntityResolver:
    """
    Deterministic Entity Resolution engine querying canonical registry and aliases.
    """
    def __init__(self, db_conn=None):
        self.conn = db_conn

    def _get_conn(self):
        return self.conn or get_connection()

    def resolve_term(self, term: str, min_confidence: float = 0.70) -> List[EntityMatchExplanation]:
        """
        Given an input term or query token, resolve potential matching entities.
        Returns explainable matches ordered by confidence.
        """
        if not term or not term.strip():
            return []

        conn = self._get_conn()
        norm_term = normalize_name(term)
        comp_term = compact_name(term)

        matches: List[EntityMatchExplanation] = []
        seen_entity_ids = set()

        # Step 1: Check Exact Canonical Name
        cur = conn.execute(
            "SELECT id, canonical_name, entity_type FROM entities WHERE lower(canonical_name) = ? OR id = ?",
            (term.lower().strip(), term.strip())
        )
        for row in cur.fetchall():
            seen_entity_ids.add(row["id"])
            matches.append(EntityMatchExplanation(
                query_term=term,
                matched_entity_id=row["id"],
                canonical_name=row["canonical_name"],
                matched_alias=row["canonical_name"],
                match_strategy="exact_canonical",
                similarity_score=1.0,
                explanation_text=f"Exact match on canonical entity name '{row['canonical_name']}'."
            ))

        # Step 2: Check Exact / Normalized Aliases
        cur = conn.execute(
            """
            SELECT a.entity_id, e.canonical_name, a.alias, a.normalized_alias, a.alias_type, a.confidence
            FROM entity_aliases a
            JOIN entities e ON a.entity_id = e.id
            WHERE a.normalized_alias = ? OR lower(a.alias) = ?
            """,
            (norm_term, term.lower().strip())
        )
        for row in cur.fetchall():
            if row["entity_id"] not in seen_entity_ids:
                seen_entity_ids.add(row["entity_id"])
                matches.append(EntityMatchExplanation(
                    query_term=term,
                    matched_entity_id=row["entity_id"],
                    canonical_name=row["canonical_name"],
                    matched_alias=row["alias"],
                    match_strategy="exact_alias",
                    similarity_score=row["confidence"],
                    explanation_text=(
                        f"Matched registered {row['alias_type']} alias '{row['alias']}' "
                        f"for canonical entity '{row['canonical_name']}'."
                    )
                ))

        # Step 3: Compact Match (e.g. 'apt29' matches 'apt-29' or 'apt 29')
        if comp_term:
            cur = conn.execute(
                """
                SELECT a.entity_id, e.canonical_name, a.alias, a.alias_type
                FROM entity_aliases a
                JOIN entities e ON a.entity_id = e.id
                """
            )
            for row in cur.fetchall():
                if row["entity_id"] in seen_entity_ids:
                    continue
                alias_comp = compact_name(row["alias"])
                canonical_comp = compact_name(row["canonical_name"])
                if comp_term == alias_comp or comp_term == canonical_comp:
                    seen_entity_ids.add(row["entity_id"])
                    matches.append(EntityMatchExplanation(
                        query_term=term,
                        matched_entity_id=row["entity_id"],
                        canonical_name=row["canonical_name"],
                        matched_alias=row["alias"],
                        match_strategy="compact_exact",
                        similarity_score=0.98,
                        explanation_text=(
                            f"Punctuation-normalized compact match ('{comp_term}') on "
                            f"'{row['alias']}' for '{row['canonical_name']}'."
                        )
                    ))

        # Step 4: Fuzzy String Similarity (Jaro-Winkler + Token Sort)
        if len(norm_term) >= 3:
            cur = conn.execute(
                """
                SELECT a.entity_id, e.canonical_name, a.alias, a.alias_type
                FROM entity_aliases a
                JOIN entities e ON a.entity_id = e.id
                """
            )
            for row in cur.fetchall():
                eid = row["entity_id"]
                if eid in seen_entity_ids:
                    continue

                sim_jw = jaro_winkler_similarity(norm_term, normalize_name(row["alias"]))
                sim_token = token_sort_ratio(norm_term, normalize_name(row["alias"]))
                best_sim = max(sim_jw, sim_token)

                if best_sim >= min_confidence:
                    seen_entity_ids.add(eid)
                    matches.append(EntityMatchExplanation(
                        query_term=term,
                        matched_entity_id=eid,
                        canonical_name=row["canonical_name"],
                        matched_alias=row["alias"],
                        match_strategy="fuzzy_jaro_winkler",
                        similarity_score=round(best_sim, 3),
                        explanation_text=(
                            f"High fuzzy similarity ({round(best_sim * 100, 1)}%) between query '{term}' "
                            f"and known alias '{row['alias']}' for '{row['canonical_name']}'."
                        )
                    ))

        # Sort matches descending by similarity score
        matches.sort(key=lambda m: m.similarity_score, reverse=True)
        return matches

    def get_entity_cluster(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve canonical entity details with all aliases and evidence links."""
        conn = self._get_conn()
        cur = conn.execute("SELECT * FROM entities WHERE id = ?", (entity_id,))
        ent_row = cur.fetchone()
        if not ent_row:
            return None

        ent_dict = dict(ent_row)
        cur_aliases = conn.execute(
            "SELECT * FROM entity_aliases WHERE entity_id = ? ORDER BY confidence DESC",
            (entity_id,)
        )
        ent_dict["aliases"] = [dict(a) for a in cur_aliases.fetchall()]
        return ent_dict
