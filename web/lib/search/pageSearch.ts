// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// In-page full-text search (Methods, Evidence). The index is the rendered page itself, so it can never drift from
// what the reader sees: sections, equation cards, limitations, validation rows, PSI dataset rows and references.
// Pure functions (normalise / tokenise / score / snippet) are unit-tested; `indexDom` is the only DOM-reading code.

export type HitKind = "Equation" | "Model" | "Section" | "Limitation" | "Validation" | "NASA dataset" | "Source" | "Sample" | "Material";
export interface Entry { anchor: string; title: string; text: string; kind: HitKind }
export interface Hit extends Entry { score: number; snippet: string }

const SUB = "₀₁₂₃₄₅₆₇₈₉";
/** Lower-case, subscript digits → digits, µ → u. Length-preserving so match offsets map back to the original text. */
export function norm(s: string): string {
  let o = "";
  for (const ch of s.toLowerCase()) { const i = SUB.indexOf(ch); o += i >= 0 ? String(i) : ch === "µ" || ch === "μ" ? "u" : ch; }
  return o;
}
export const tokens = (s: string): string[] => norm(s).match(/[a-z0-9]+/g) ?? [];

export function kindOf(anchor: string, fallback: HitKind = "Section"): HitKind {
  if (anchor.startsWith("eq-")) return "Equation";
  if (anchor.startsWith("model-")) return "Model";
  if (anchor.startsWith("source-")) return "Source";
  if (anchor.startsWith("val-")) return "Validation";
  if (/^psi-\d+$/.test(anchor)) return "NASA dataset";
  if (anchor.startsWith("limit")) return "Limitation";
  return fallback;
}

const KIND_BONUS: Record<HitKind, number> = { Equation: 1.5, "NASA dataset": 1.5, Limitation: 1.2, Material: 1.2, Model: 1, Validation: 1, Source: 0.8, Sample: 0.8, Section: 0.5 };

/** Every query token must prefix-match a token of the entry (AND). Title hits weigh 4×; exact accession/id hits win. */
export function search(entries: Entry[], query: string, k = 8): Hit[] {
  const q = tokens(query);
  if (!q.length) return [];
  const out: Hit[] = [];
  for (const e of entries) {
    const tt = tokens(e.title), xt = tokens(e.text);
    let score = 0, all = true;
    for (const t of q) {
      const inTitle = tt.some((w) => w.startsWith(t)), inText = xt.some((w) => w.startsWith(t));
      if (!inTitle && !inText) { all = false; break; }
      score += (inTitle ? 4 : 0) + (inText ? 1 : 0) + (tt.includes(t) || xt.includes(t) ? 0.5 : 0);
    }
    if (!all) continue;
    if (norm(e.anchor).replace(/-/g, "") === q.join("")) score += 10; // "psi 25" / "eq sp1" → that entry
    score += KIND_BONUS[e.kind] - Math.min(1, e.text.length / 4000);
    out.push({ ...e, score, snippet: snippet(e.text, q) });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, k);
}

/** ~160 characters around the first query-token match. */
export function snippet(text: string, q: string[], width = 160): string {
  const n = norm(text);
  let at = -1;
  for (const t of q) { const re = new RegExp(`(?:^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`); const m = re.exec(n); if (m && (at < 0 || m.index < at)) at = m.index; }
  if (at < 0) return text.slice(0, width);
  const start = Math.max(0, at - Math.floor(width / 3));
  return `${start > 0 ? "…" : ""}${text.slice(start, start + width).trim()}${start + width < text.length ? "…" : ""}`;
}

/** Split `text` into [plain, match, plain, match…] parts for <mark> highlighting. */
export function highlightParts(text: string, query: string): { s: string; hit: boolean }[] {
  const q = tokens(query);
  if (!q.length) return [{ s: text, hit: false }];
  const n = norm(text);
  const re = new RegExp(`(${q.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  const parts: { s: string; hit: boolean }[] = [];
  let last = 0;
  for (let m = re.exec(n); m; m = re.exec(n)) {
    if (m.index > last) parts.push({ s: text.slice(last, m.index), hit: false });
    parts.push({ s: text.slice(m.index, m.index + m[0].length), hit: true });
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < text.length) parts.push({ s: text.slice(last), hit: false });
  return parts;
}

const clean = (s: string) => s.replace(/\s+/g, " ").replace(/\s+([.,;:)])/g, "$1").replace(/([(])\s+/g, "$1").trim();
/** Text of an element with a space at every element boundary ("SP1" + "de Ris…" → "SP1 de Ris…"). */
function textOf(node: Node): string {
  let out = "";
  const walk = (n: Node) => {
    if (n.nodeType === 3) out += n.nodeValue ?? "";
    else if (n.nodeType === 1) { out += " "; n.childNodes.forEach(walk); out += " "; }
  };
  walk(node);
  return out;
}

/** Build the index from the rendered page. Items: anything with an id inside `root`, plus `[data-search-item]`. */
export function indexDom(root: ParentNode): Entry[] {
  const out: Entry[] = [];
  const seen = new Set<string>();
  const els = root.querySelectorAll<HTMLElement>("section[id], article[id], details[id], li[id], tr[id], [data-search-item], [data-search-items] > *");
  els.forEach((el) => {
    const anchor = el.id || el.closest<HTMLElement>("[id]")?.id || "";
    if (!anchor) return;
    const copy = el.cloneNode(true) as HTMLElement;
    copy.querySelectorAll(".katex, button, [data-search-skip], script, style").forEach((x) => x.remove());
    const headEl = [...el.querySelectorAll("h1, h2, h3, summary, strong, b, th, td, a")].find((x) => x.textContent?.trim());
    const head = el.dataset.searchTitle ?? (headEl ? textOf(headEl) : el.id);
    const title = clean(head).replace(/^\d{2}\s+/, "");
    const text = clean(textOf(copy)).slice(0, 1200);
    const key = `${anchor}|${title}`;
    if (!title || seen.has(key)) return;
    seen.add(key);
    out.push({ anchor, title: title.length > 110 ? `${title.slice(0, 108)}…` : title, text, kind: kindOf(el.id || anchor, (el.dataset.searchKind as HitKind) || (el.parentElement?.dataset.searchItems as HitKind) || "Section") });
  });
  return out;
}

/** Scroll to an anchor, opening any <details> it sits in (equation cards are collapsed by default). */
export function reveal(anchor: string, smooth = true): boolean {
  const el = document.getElementById(anchor);
  if (!el) return false;
  if (el instanceof HTMLDetailsElement) el.open = true;
  for (let p = el.parentElement; p; p = p.parentElement) if (p instanceof HTMLDetailsElement) p.open = true;
  el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  el.classList.add("ea-search-target");
  window.setTimeout(() => el.classList.remove("ea-search-target"), 1800);
  return true;
}
