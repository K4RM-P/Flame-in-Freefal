"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Evidence > Data: PSI Experimental tables ingested by physics/pipeline/ingest_psi.py. Rows load lazily from /psi/<key>.json.
import { useEffect, useState } from "react";
import index from "@/data/psi/tables_index.json";
import { download } from "@/lib/report";

interface TableInfo { key: string; rows: number; accessions: string[]; columns: string[]; qc_rows: number; files: string[] }
type Row = Record<string, unknown>;
const TABLES = index as TableInfo[];
const HIDE = new Set(["id", "table", "row_index", "verified", "digitized", "source_id"]);
const cell = (v: unknown) => (v == null ? "" : typeof v === "number" ? String(Number(v.toPrecision(6))) : Array.isArray(v) ? v.join("; ") : String(v));

export function PsiTables() {
  const [key, setKey] = useState(TABLES.find((t) => t.key === "bass2")?.key ?? TABLES[0].key);
  const [rows, setRows] = useState<Row[] | null>(null);
  const info = TABLES.find((t) => t.key === key)!;
  useEffect(() => {
    let live = true;
    setRows(null);
    fetch(`/psi/${key}.json`).then((r) => r.json()).then((d) => live && setRows(d)).catch(() => live && setRows([]));
    return () => { live = false; };
  }, [key]);
  const cols = info.columns.filter((c) => !HIDE.has(c));
  const exportCsv = () => {
    if (!rows?.length) return;
    const all = Object.keys(rows[0]);
    const esc = (v: unknown) => { const s = cell(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    download(`emberatlas_psi_${key}.csv`, [all.join(","), ...rows.map((r) => all.map((c) => esc(r[c])).join(","))].join("\n"), "text/csv");
  };
  return (
    <section className="card text-sm" data-testid="psi-tables">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="label">PSI Experimental tables ({TABLES.reduce((a, t) => a + t.rows, 0)} rows, all unverified until spot-check)</span>
        <select value={key} onChange={(e) => setKey(e.target.value)} aria-label="PSI table" data-testid="psi-table-select">
          {TABLES.map((t) => <option key={t.key} value={t.key}>{t.key} · {t.accessions.join(", ")} · {t.rows} rows</option>)}
        </select>
        <button className="btn" onClick={exportCsv} disabled={!rows?.length}>Export CSV (with raw)</button>
      </div>
      <p className="mb-2 text-xs text-mute">Source: {info.files.join("; ")} · {info.qc_rows} rows carry a qc_flag (blank, ambiguous or approximate cells are never filled in) · verified = false.</p>
      <div className="max-h-[28rem] overflow-auto">
        {!rows ? <p className="text-mute">Loading…</p> : (
          <table className="data"><thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{rows.map((r) => <tr key={String(r.id)}>{cols.map((c) => <td key={c} className={c === "locator" || c === "raw" ? "text-xs text-mute" : typeof r[c] === "number" ? "num" : ""}>{cell(r[c])}</td>)}</tr>)}</tbody></table>
        )}
      </div>
    </section>
  );
}
