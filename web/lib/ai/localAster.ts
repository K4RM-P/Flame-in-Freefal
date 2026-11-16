// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Catalog retrieval for Aster when there is no run on screen: field-weighted BM25 over the bundled PSI catalog
// (accession/short name/title weighted above the objective) with a small domain synonym table, so "Moon fabric fire"
// finds SAFFIRE/BASS rather than whatever shares the most common words. Answers quote stated objectives only.
import catalog from "@/data/psi_catalog.json";
import sourcesJson from "@/data/sources.json";

type Study = (typeof catalog.investigations)[keyof typeof catalog.investigations];
const studies = Object.values(catalog.investigations) as Study[];
const SOURCES = sourcesJson as Record<string, { title?: string; url?: string; note?: string }>;

const STOP = new Set(["about", "what", "was", "were", "did", "can", "which", "does", "with", "from", "could", "would", "tell", "explain", "nasa", "experiment", "experiments", "study", "data", "fire", "the", "are", "how", "why", "this", "that", "and", "for", "into", "its", "there", "their", "they", "than", "then", "when", "where", "who", "has", "have", "had", "will", "more", "less", "last", "longer", "use", "used"]);
/** Plain-language → catalog vocabulary. Only expands the query; never adds facts. */
const SYNONYMS: Record<string, string[]> = {
  moon: ["lunar", "partial", "gravity"], lunar: ["partial", "gravity"], mars: ["partial", "gravity"],
  fabric: ["sibal", "cotton", "fiberglass", "solid", "saffire"], cloth: ["sibal", "fabric", "solid"], textile: ["sibal", "fabric"],
  spread: ["spread", "flame", "solid", "saffire", "bass"], burn: ["burning", "flame"], burns: ["burning", "flame"],
  extinguish: ["extinguishment", "suppression", "flex"], extinguisher: ["suppression", "extinguishment"], suppress: ["suppression"],
  co2: ["suppression", "diluent", "carbon"], smoke: ["smoke", "aerosol", "particle"], detector: ["smoke", "aerosol", "detection"],
  droplet: ["droplet", "flex", "fuel"], plastic: ["pmma", "acrylic", "solid"], acrylic: ["pmma"], oxygen: ["oxygen", "concentration"],
  spacecraft: ["spacecraft", "saffire", "cygnus"], large: ["saffire", "large", "scale"], soot: ["soot", "smoke", "spice"],
};
/** Tokens, keeping "saffire-ii" and also its parts ("saffire", "ii") so either spelling matches. */
const tok = (s: string) => (s.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) ?? []).flatMap((t) => (t.includes("-") ? [t, ...t.split("-")] : [t]));

interface Doc { study: Study; name: string[]; body: string[] }
const DOCS: Doc[] = studies.map((study) => ({ study, name: tok(`${study.accession} ${study.short_name ?? ""} ${study.title}`), body: tok(study.objective ?? "") }));
const N = DOCS.length;
const df = new Map<string, number>();
for (const d of DOCS) for (const t of new Set([...d.name, ...d.body])) df.set(t, (df.get(t) ?? 0) + 1);
const avgName = DOCS.reduce((a, d) => a + d.name.length, 0) / N, avgBody = DOCS.reduce((a, d) => a + d.body.length, 0) / N;
const idf = (t: string) => Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
function bm25(terms: string[], field: string[], avg: number, k1 = 1.2, b = 0.75) {
  let s = 0;
  for (const t of terms) {
    const f = field.filter((x) => x === t).length;
    if (f) s += idf(t) * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * field.length) / avg)));
  }
  return s;
}

export function queryTerms(question: string): string[] {
  const base = tok(question).filter((t) => t.length > 1 && !STOP.has(t));
  return [...new Set(base.flatMap((t) => [t, ...(SYNONYMS[t] ?? [])]))];
}

export function rankStudies(question: string, k = 3) {
  const terms = queryTerms(question);
  return DOCS.map((d) => ({ study: d.study, score: 3 * bm25(terms, d.name, avgName) + bm25(terms, d.body, avgBody) }))
    .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
}

const PARTIAL_G = /\b(moon|lunar|mars|partial)\b/i;

export function answerLocally(question: string) {
  const ranked = rankStudies(question, 3);
  const fm2 = SOURCES["ntrs-20240015307"];
  const pg = PARTIAL_G.test(question) && fm2?.url
    ? ` PSI holds microgravity and 1 g tests only; for lunar gravity, NASA's FM2 tests (NTRS 20240015307, outside PSI) are the reference: ${fm2.note ?? ""}`
    : "";
  if (!ranked.length) return { answer: `I couldn’t match that question to a study in the local catalog. Try asking about FLEX droplets, BASS-II flame spread, Saffire, or smoke aerosols.${pg}`, sources: [] };
  return {
    answer: `These NASA records are the closest matches to your question (ranked by catalog search, not by an engine run). Their stated objectives are shown below.${pg}`,
    sources: ranked.map(({ study }) => ({
      id: study.accession,
      title: study.title,
      url: study.psi_url,
      excerpt: (study.objective ?? "").trim().split(/\n\s*\n/)[0].slice(0, 420),
    })),
  };
}
