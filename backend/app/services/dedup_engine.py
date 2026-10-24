"""
Deduplication & Anti-Circularity Engine for HistoryFather.
Implements:
  1. Exact document hashing (SHA-256)
  2. 64-bit Locality Sensitive Hashing (SimHash) for near-duplicate and wire-reprint detection
  3. Hamming distance calculations for near-duplication thresholding
  4. N-gram shingling & MinHash Jaccard approximation
  5. Circular reporting & echo-chamber detection to prevent false inflation of corroboration
"""

import hashlib
import re
from typing import List, Set, Tuple, Dict, Any, Optional

def compute_sha256(text: str) -> str:
    """Compute SHA-256 hash of normalized text for exact duplicate detection."""
    normalized = " ".join(text.strip().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

def tokenize(text: str) -> List[str]:
    """Tokenize text into lowercase alphanumeric tokens."""
    return re.findall(r"\b\w+\b", text.lower())

def get_shingles(tokens: List[str], n: int = 3) -> List[str]:
    """Generate n-gram shingles from token list."""
    if len(tokens) < n:
        return [" ".join(tokens)] if tokens else []
    return [" ".join(tokens[i:i+n]) for i in range(len(tokens) - n + 1)]

def compute_simhash(text: str, hash_bits: int = 64) -> str:
    """
    Compute a 64-bit SimHash fingerprint for text.
    Uses multi-order feature shingles (unigrams, bigrams, trigrams)
    for high sensitivity to semantic near-duplication.
    """
    tokens = tokenize(text)
    if not tokens:
        return "0" * (hash_bits // 4)
    
    features = list(tokens)
    if len(tokens) >= 2:
        features.extend(get_shingles(tokens, n=2))
    if len(tokens) >= 3:
        features.extend(get_shingles(tokens, n=3))
    
    v = [0] * hash_bits
    for feat in features:
        h = int(hashlib.md5(feat.encode("utf-8")).hexdigest()[:16], 16)
        for i in range(hash_bits):
            if (h >> i) & 1:
                v[i] += 1
            else:
                v[i] -= 1
                
    fingerprint = 0
    for i in range(hash_bits):
        if v[i] > 0:
            fingerprint |= (1 << i)
            
    return f"{fingerprint:016x}"

def hamming_distance(hash1_hex: str, hash2_hex: str) -> int:
    """Calculate the bitwise Hamming distance between two hexadecimal SimHash strings."""
    try:
        val1 = int(hash1_hex, 16)
        val2 = int(hash2_hex, 16)
        xor_val = val1 ^ val2
        # Count set bits
        return bin(xor_val).count("1")
    except Exception:
        return 64

def is_near_duplicate(hash1_hex: str, hash2_hex: str, max_hamming_distance: int = 10) -> bool:
    """Returns True if two documents have Hamming distance <= threshold (typically 6-10 for 64-bit)."""
    return hamming_distance(hash1_hex, hash2_hex) <= max_hamming_distance

def jaccard_similarity(set1: Set[str], set2: Set[str]) -> float:
    """Compute Jaccard similarity coefficient between two sets."""
    if not set1 or not set2:
        return 0.0
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    return intersection / union if union > 0 else 0.0

def passage_shingle_jaccard(text1: str, text2: str, n: int = 4) -> float:
    """Compute 4-gram shingle Jaccard similarity for short passages."""
    t1 = set(get_shingles(tokenize(text1), n))
    t2 = set(get_shingles(tokenize(text2), n))
    return jaccard_similarity(t1, t2)

def detect_syndication_and_circularity(
    documents: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Analyze a collection of documents for:
      1. Syndicated copies (wire reprints, press releases copy-pasted without original reporting)
      2. Circular reporting risks (Document B published later, sharing high textual similarity with Document A)
      3. True independent corroboration vs Echo count
    """
    sorted_docs = sorted(documents, key=lambda d: d.get("publication_time", ""))
    clusters = []
    circular_warnings = []
    
    seen_in_cluster = set()
    
    for i in range(len(sorted_docs)):
        doc_a = sorted_docs[i]
        id_a = doc_a["id"]
        if id_a in seen_in_cluster:
            continue
            
        hash_a = doc_a.get("simhash") or compute_simhash(doc_a.get("raw_content", ""))
        cluster_reprints = []
        
        for j in range(i + 1, len(sorted_docs)):
            doc_b = sorted_docs[j]
            id_b = doc_b["id"]
            if id_b in seen_in_cluster:
                continue
                
            hash_b = doc_b.get("simhash") or compute_simhash(doc_b.get("raw_content", ""))
            dist = hamming_distance(hash_a, hash_b)
            jacc = passage_shingle_jaccard(doc_a.get("raw_content", ""), doc_b.get("raw_content", ""))
            is_explicit_syndicate = (doc_b.get("canonical_source_id") == id_a)
            
            # If distance is small, or shingle Jaccard is high, or explicitly linked as syndicate
            if (is_explicit_syndicate) or (dist <= 10 and jacc >= 0.35) or (jacc >= 0.40):
                seen_in_cluster.add(id_b)
                similarity_pct = round(max((64 - dist) / 64 * 100, jacc * 100), 1)
                
                # Check for source difference
                is_diff_source = doc_a.get("source_name") != doc_b.get("source_name")
                is_circular = is_diff_source and (dist <= 12 or jacc >= 0.35 or is_explicit_syndicate)
                
                cluster_reprints.append({
                    "id": id_b,
                    "title": doc_b.get("title", ""),
                    "source_name": doc_b.get("source_name", ""),
                    "publication_time": doc_b.get("publication_time", ""),
                    "hamming_distance": dist,
                    "text_similarity_pct": similarity_pct,
                    "is_different_source": is_diff_source,
                    "is_circular_risk": is_circular
                })
                
                if is_circular:
                    circular_warnings.append({
                        "original_doc_id": id_a,
                        "original_title": doc_a.get("title"),
                        "original_source": doc_a.get("source_name"),
                        "original_time": doc_a.get("publication_time"),
                        "echo_doc_id": id_b,
                        "echo_title": doc_b.get("title"),
                        "echo_source": doc_b.get("source_name"),
                        "echo_time": doc_b.get("publication_time"),
                        "similarity_pct": similarity_pct,
                        "warning": (
                            f"{doc_b.get('source_name')} published content with {similarity_pct}% "
                            f"text overlap with earlier report by {doc_a.get('source_name')}. "
                            f"Do NOT treat this as independent secondary corroboration."
                        )
                    })
                    
        if cluster_reprints:
            seen_in_cluster.add(id_a)
            clusters.append({
                "cluster_id": f"cluster_{id_a}",
                "canonical_source": doc_a.get("source_name", "Unknown"),
                "original_doc_id": id_a,
                "original_doc_title": doc_a.get("title", ""),
                "original_pub_time": doc_a.get("publication_time", ""),
                "syndicated_reprints": cluster_reprints,
                "simhash_similarity": cluster_reprints[0]["text_similarity_pct"] if cluster_reprints else 100.0,
                "is_circular_risk": any(r["is_circular_risk"] for r in cluster_reprints),
                "verdict": "Syndicated / Echo Network Detected"
            })
            
    return {
        "clusters": clusters,
        "circular_warnings": circular_warnings,
        "total_documents_analyzed": len(documents),
        "independent_origins_count": len(sorted_docs) - len(seen_in_cluster) + len(clusters)
    }
