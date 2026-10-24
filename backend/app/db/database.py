"""
Database manager for HistoryFather with SQLite + FTS5 full-text search.
Provides connection pooling, WAL mode, transaction support, and dictionary row factories.
"""

import sqlite3
import os
import json
from pathlib import Path
from typing import Generator, Any, List, Dict, Optional
from contextlib import contextmanager

DB_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DB_PATH = DB_DIR / "historyfather.db"
SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"

def get_db_path() -> Path:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    return DB_PATH

def get_connection(db_file: Optional[str] = None) -> sqlite3.Connection:
    target = db_file if db_file else str(get_db_path())
    conn = sqlite3.connect(target, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    if target != ":memory:":
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
    return conn

def init_db(db_file: Optional[str] = None) -> None:
    """Initialize database tables, indexes, and FTS5 structures from schema.sql."""
    conn = get_connection(db_file)
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    conn.executescript(schema_sql)
    conn.commit()
    conn.close()

@contextmanager
def db_session(db_file: Optional[str] = None) -> Generator[sqlite3.Connection, None, None]:
    """Context manager for database sessions with automatic commit / rollback."""
    conn = get_connection(db_file)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    """Convert sqlite3.Row to standard Python dictionary, parsing JSON fields if applicable."""
    res = dict(row)
    for k, v in res.items():
        if isinstance(v, str) and (v.startswith("{") or v.startswith("[")):
            try:
                res[k] = json.loads(v)
            except Exception:
                pass
    return res

def rows_to_dicts(rows: List[sqlite3.Row]) -> List[Dict[str, Any]]:
    return [row_to_dict(r) for r in rows]
