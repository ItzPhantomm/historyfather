"""
Investigation Workspace & Dossier Export Engine for HistoryFather.
Manages:
  1. Case Workspaces & Hypothesis Ledger (Supports vs Refutes stances)
  2. Pinning Entities, Events, Claims, Passages, and Relationships
  3. Multi-Format Dossier Export:
     - Structured Markdown Intelligence Report
     - Standalone Self-Contained HTML Briefing
     - Complete JSON Archive
"""

import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.db.database import get_connection, row_to_dict, rows_to_dicts
from app.schemas.models import (
    WorkspaceCreate, WorkspaceDetail, WorkspaceItemAdd, WorkspaceNoteCreate
)

def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

class DossierEngine:
    def __init__(self, db_conn=None):
        self.conn = db_conn

    def _get_conn(self):
        return self.conn or get_connection()

    def create_workspace(self, req: WorkspaceCreate) -> WorkspaceDetail:
        conn = self._get_conn()
        ws_id = f"ws_{uuid.uuid4().hex[:10]}"
        now = utcnow_iso()
        conn.execute(
            """
            INSERT INTO workspaces (id, title, description, analyst_name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (ws_id, req.title, req.description, req.analyst_name, now, now)
        )
        conn.commit()
        return self.get_workspace(ws_id)

    def list_workspaces(self) -> List[Dict[str, Any]]:
        conn = self._get_conn()
        cur = conn.execute(
            """
            SELECT w.*, 
                   COUNT(DISTINCT wi.id) as item_count,
                   COUNT(DISTINCT wn.id) as note_count
            FROM workspaces w
            LEFT JOIN workspace_items wi ON w.id = wi.workspace_id
            LEFT JOIN workspace_notes wn ON w.id = wn.workspace_id
            GROUP BY w.id
            ORDER BY w.updated_at DESC
            """
        )
        return [dict(r) for r in cur.fetchall()]

    def get_workspace(self, workspace_id: str) -> Optional[WorkspaceDetail]:
        conn = self._get_conn()
        cur = conn.execute("SELECT * FROM workspaces WHERE id = ?", (workspace_id,))
        ws_row = cur.fetchone()
        if not ws_row:
            return None

        # Fetch items
        cur_items = conn.execute(
            "SELECT * FROM workspace_items WHERE workspace_id = ? ORDER BY pinned_at DESC",
            (workspace_id,)
        )
        items = []
        for r in cur_items.fetchall():
            item_dict = dict(r)
            # Hydrate item details based on item_type
            itype = item_dict["item_type"]
            iid = item_dict["item_id"]
            if itype == "entity":
                erow = conn.execute("SELECT * FROM entities WHERE id = ?", (iid,)).fetchone()
                if erow:
                    item_dict["details"] = dict(erow)
            elif itype == "claim":
                crow = conn.execute("SELECT * FROM claims WHERE id = ?", (iid,)).fetchone()
                if crow:
                    item_dict["details"] = dict(crow)
            elif itype == "event":
                evrow = conn.execute("SELECT * FROM events WHERE id = ?", (iid,)).fetchone()
                if evrow:
                    item_dict["details"] = dict(evrow)
            elif itype == "passage":
                prow = conn.execute(
                    "SELECT p.*, d.title as doc_title, d.source_name FROM passages p JOIN documents d ON p.document_id = d.id WHERE p.id = ?",
                    (iid,)
                ).fetchone()
                if prow:
                    item_dict["details"] = dict(prow)
            items.append(item_dict)

        # Fetch notes
        cur_notes = conn.execute(
            "SELECT * FROM workspace_notes WHERE workspace_id = ? ORDER BY updated_at DESC",
            (workspace_id,)
        )
        notes = [dict(r) for r in cur_notes.fetchall()]

        return WorkspaceDetail(
            id=ws_row["id"],
            title=ws_row["title"],
            description=ws_row["description"],
            analyst_name=ws_row["analyst_name"],
            created_at=ws_row["created_at"],
            updated_at=ws_row["updated_at"],
            items=items,
            notes=notes
        )

    def add_item(self, workspace_id: str, item: WorkspaceItemAdd) -> Dict[str, Any]:
        conn = self._get_conn()
        item_id = f"wi_{uuid.uuid4().hex[:10]}"
        now = utcnow_iso()
        conn.execute(
            """
            INSERT OR REPLACE INTO workspace_items
            (id, workspace_id, item_type, item_id, pinned_at, analyst_note, hypothesis_stance)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (item_id, workspace_id, item.item_type, item.item_id, now, item.analyst_note, item.hypothesis_stance)
        )
        conn.execute("UPDATE workspaces SET updated_at = ? WHERE id = ?", (now, workspace_id))
        conn.commit()
        return {"status": "ok", "workspace_item_id": item_id}

    def remove_item(self, workspace_id: str, workspace_item_id: str) -> Dict[str, Any]:
        conn = self._get_conn()
        conn.execute("DELETE FROM workspace_items WHERE workspace_id = ? AND (id = ? OR item_id = ?)", (workspace_id, workspace_item_id, workspace_item_id))
        conn.commit()
        return {"status": "ok"}

    def add_note(self, workspace_id: str, note: WorkspaceNoteCreate) -> Dict[str, Any]:
        conn = self._get_conn()
        note_id = f"wn_{uuid.uuid4().hex[:10]}"
        now = utcnow_iso()
        conn.execute(
            """
            INSERT INTO workspace_notes (id, workspace_id, title, content, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (note_id, workspace_id, note.title, note.content, now)
        )
        conn.execute("UPDATE workspaces SET updated_at = ? WHERE id = ?", (now, workspace_id))
        conn.commit()
        return {"status": "ok", "note_id": note_id}

    def export_dossier_markdown(self, workspace_id: str) -> str:
        """Export workspace as an executive Markdown intelligence dossier."""
        ws = self.get_workspace(workspace_id)
        if not ws:
            return "# Error: Workspace Not Found"

        lines = [
            f"# INTELLIGENCE DOSSIER: {ws.title.upper()}",
            f"**Lead Analyst:** {ws.analyst_name}",
            f"**Generated:** {utcnow_iso()}",
            f"**Case Reference:** `{ws.id}`",
            "",
            "## Executive Summary",
            ws.description or "No summary provided.",
            "",
            "---",
            "## Hypothesis Ledger & Evidence Stance",
            ""
        ]

        # Group by hypothesis stance
        supports = [i for i in ws.items if i.get("hypothesis_stance") == "supports_hypothesis"]
        refutes = [i for i in ws.items if i.get("hypothesis_stance") == "refutes_hypothesis"]
        neutral = [i for i in ws.items if i.get("hypothesis_stance") == "neutral"]

        lines.append("### Supporting Evidence")
        if supports:
            for item in supports:
                d = item.get("details", {})
                lines.append(f"- **[{item['item_type'].upper()}]** {d.get('canonical_name') or d.get('title') or d.get('claim_text') or item['item_id']}")
                if item.get("analyst_note"):
                    lines.append(f"  *Analyst Note:* {item['analyst_note']}")
        else:
            lines.append("_No items currently tagged as supporting._")
        lines.append("")

        lines.append("### Contradictory / Refuting Evidence")
        if refutes:
            for item in refutes:
                d = item.get("details", {})
                lines.append(f"- **[CONTRADICTION]** {d.get('canonical_name') or d.get('title') or d.get('claim_text') or item['item_id']}")
                if item.get("analyst_note"):
                    lines.append(f"  *Refutation Analysis:* {item['analyst_note']}")
        else:
            lines.append("_No contradictory evidence recorded._")
        lines.append("")

        lines.append("---",)
        lines.append("## Analyst Working Notes")
        if ws.notes:
            for n in ws.notes:
                lines.append(f"### {n['title']}")
                lines.append(f"*Last Modified:* {n['updated_at']}")
                lines.append("")
                lines.append(n["content"])
                lines.append("")
        else:
            lines.append("_No notes recorded._")
            lines.append("")

        lines.append("---")
        lines.append("## Complete Bookmarked Evidence Appendix")
        for idx, item in enumerate(ws.items, 1):
            d = item.get("details", {})
            lines.append(f"### Item #{idx}: {item['item_type'].capitalize()} (`{item['item_id']}`)")
            lines.append(f"- **Pinned At:** {item['pinned_at']}")
            lines.append(f"- **Hypothesis Stance:** `{item.get('hypothesis_stance')}`")
            if d.get("text"):
                lines.append(f"- **Verbatim Quote:** > {d['text']}")
                lines.append(f"- **Source:** {d.get('source_name')} ({d.get('doc_title')})")
            elif d.get("claim_text"):
                lines.append(f"- **Claim:** {d['claim_text']}")
                lines.append(f"- **Certainty Tier:** {d.get('certainty_tier')} (Confidence: {d.get('confidence_score')})")
            elif d.get("description"):
                lines.append(f"- **Event:** {d.get('title')}")
                lines.append(f"- **Description:** {d.get('description')}")
            lines.append("")

        return "\n".join(lines)

    def export_dossier_html(self, workspace_id: str) -> str:
        """Generate a standalone printable dark intelligence report in HTML."""
        ws = self.get_workspace(workspace_id)
        if not ws:
            return "<html><body><h1>Workspace Not Found</h1></body></html>"

        md_content = self.export_dossier_markdown(workspace_id)
        # Generate clean HTML presentation
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>HistoryFather Intelligence Dossier - {ws.title}</title>
<style>
  body {{
    background-color: #09090b;
    color: #e4e4e7;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
    padding: 40px;
    line-height: 1.6;
    max-width: 900px;
    margin: 0 auto;
  }}
  h1, h2, h3 {{ color: #fafafa; letter-spacing: -0.02em; border-bottom: 1px solid #27272a; padding-bottom: 8px; }}
  h1 {{ font-size: 28px; color: #38bdf8; }}
  h2 {{ font-size: 20px; margin-top: 32px; color: #a1a1aa; }}
  h3 {{ font-size: 16px; color: #f43f5e; }}
  .badge {{ display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: #27272a; color: #a1a1aa; }}
  .badge-support {{ background: #064e3b; color: #34d399; }}
  .badge-refute {{ background: #4c0519; color: #fb7185; }}
  .quote {{ border-left: 3px solid #38bdf8; padding-left: 14px; margin: 12px 0; font-style: italic; color: #cbd5e1; background: #18181b; padding: 10px 14px; }}
  .item-card {{ background: #18181b; border: 1px solid #27272a; border-radius: 6px; padding: 16px; margin-bottom: 16px; }}
  .meta {{ font-size: 12px; color: #71717a; margin-bottom: 8px; }}
  hr {{ border: none; border-top: 1px solid #27272a; margin: 30px 0; }}
</style>
</head>
<body>
  <h1>HISTORYFATHER // INTELLIGENCE DOSSIER</h1>
  <div class="meta">
    CASE: <strong>{ws.title}</strong> | ID: <code>{ws.id}</code> | ANALYST: {ws.analyst_name} | GENERATED: {utcnow_iso()}
  </div>
  <p>{ws.description or "No executive summary provided."}</p>
  
  <h2>Evidence & Hypothesis Ledger</h2>
  {"".join([f'''
  <div class="item-card">
    <div class="meta">
      <span class="badge {'badge-support' if it.get('hypothesis_stance') == 'supports_hypothesis' else 'badge-refute' if it.get('hypothesis_stance') == 'refutes_hypothesis' else ''}">{it.get('hypothesis_stance')}</span>
      TYPE: {it['item_type']} | PINNED: {it['pinned_at'][:19]}
    </div>
    <div><strong>{it.get('details', {}).get('canonical_name') or it.get('details', {}).get('title') or it.get('details', {}).get('claim_text') or it['item_id']}</strong></div>
    {f'<div class="quote">{it.get("details", {}).get("text")}</div>' if it.get("details", {}).get("text") else ''}
    {f'<p style="color:#fbbf24;font-size:13px;"><strong>Analyst Note:</strong> {it["analyst_note"]}</p>' if it.get("analyst_note") else ''}
  </div>
  ''' for it in ws.items])}

  <h2>Analyst Notes</h2>
  {"".join([f'''
  <div class="item-card">
    <h3>{n['title']}</h3>
    <div class="meta">Updated: {n['updated_at']}</div>
    <div>{n['content'].replace(chr(10), '<br/>')}</div>
  </div>
  ''' for n in ws.notes])}

  <hr/>
  <div class="meta" style="text-align: center;">HistoryFather Temporal Intelligence Engine &copy; 2026. All conclusions backed by verifiable evidence.</div>
</body>
</html>
"""
        return html
