"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Inline search for Methods and Evidence (not a ⌘K palette): "/" focuses it, ↑/↓ moves, Enter opens the section,
// Esc closes. Matches are highlighted; the query is kept in ?q= so a search can be shared; deep links open the
// equation card they point into.
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { highlightParts, indexDom, reveal, search, type Entry, type Hit } from "@/lib/search/pageSearch";

function Mark({ text, q }: { text: string; q: string }) {
  return <>{highlightParts(text, q).map((p, i) => (p.hit ? <mark key={i} className="ea-mark">{p.s}</mark> : <span key={i}>{p.s}</span>))}</>;
}

export function PageSearch({ placeholder, rootSelector = "main", testid = "page-search" }: { placeholder: string; rootSelector?: string; testid?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const hits: Hit[] = useMemo(() => search(entries, q, 8), [entries, q]);
  const build = () => { const root = document.querySelector(rootSelector); if (root) setEntries(indexDom(root)); };

  useEffect(() => {
    build();
    const url = new URL(window.location.href);
    const q0 = url.searchParams.get("q");
    if (q0) { setQ(q0); setOpen(true); }
    // Deep links (Aster citations, shared URLs) into a collapsed equation card: open it.
    if (url.hash.length > 1) window.setTimeout(() => reveal(decodeURIComponent(url.hash.slice(1)), false), 60);
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) { e.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncUrl = (v: string) => {
    const url = new URL(window.location.href);
    if (v.trim()) url.searchParams.set("q", v.trim()); else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", url);
  };
  const go = (h: Hit) => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${h.anchor}`);
    reveal(h.anchor, !reduce);
    setOpen(false);
  };

  return (
    <div className="relative w-full max-w-[640px]" data-testid={testid} data-noprint>
      <label className="sr-only" htmlFor={`${testid}-input`}>Search this page</label>
      <div className="flex h-10 items-center gap-2 rounded-[6px] border border-line bg-panel px-3 focus-within:border-mute focus-within:ring-1 focus-within:ring-mute/40">
        <Search size={15} strokeWidth={1.5} className="shrink-0 text-faint" aria-hidden />
        <input ref={input} id={`${testid}-input`} type="text" inputMode="search" enterKeyHint="search" role="combobox" aria-expanded={open && q.trim().length > 0} aria-controls={`${testid}-results`}
          aria-activedescendant={open && hits[active] ? `${testid}-opt-${active}` : undefined} autoComplete="off" spellCheck={false}
          className="ea-search-input h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px]" placeholder={placeholder} value={q}
          onFocus={() => { build(); setOpen(true); }}
          onChange={(e) => { setQ(e.target.value); setActive(0); setOpen(true); syncUrl(e.target.value); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, Math.max(0, hits.length - 1))); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
            else if (e.key === "Enter" && hits[active]) { e.preventDefault(); go(hits[active]); }
            else if (e.key === "Escape") { setOpen(false); input.current?.blur(); }
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)} />
        {q ? <button type="button" aria-label="Clear search" className="text-faint hover:text-ink" onClick={() => { setQ(""); syncUrl(""); input.current?.focus(); }}><X size={14} strokeWidth={1.5} /></button>
          : <span className="ea-kbd" aria-hidden>/</span>}
      </div>
      {open && q.trim() && (
        <ul id={`${testid}-results`} role="listbox" aria-label="Search results" className="absolute inset-x-0 top-11 z-40 max-h-[60vh] overflow-auto rounded-[8px] border border-line bg-panel p-1 shadow-xl">
          {hits.length === 0 && <li className="px-3 py-2.5 text-[13px] text-mute" role="option" aria-selected={false}>No match on this page for “{q.trim()}”.</li>}
          {hits.map((h, i) => (
            <li key={`${h.anchor}-${i}`} id={`${testid}-opt-${i}`} role="option" aria-selected={i === active} data-testid="search-hit"
              className={`cursor-pointer rounded-[6px] px-3 py-2 ${i === active ? "bg-surface2" : ""}`}
              onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); go(h); }}>
              <div className="flex items-baseline gap-2"><span className="ea-meta shrink-0 !text-[10px]">{h.kind}</span><span className="min-w-0 truncate text-[13px] font-medium text-ink"><Mark text={h.title} q={q} /></span></div>
              <p className="mt-0.5 line-clamp-2 text-[12px] text-mute"><Mark text={h.snippet} q={q} /></p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
