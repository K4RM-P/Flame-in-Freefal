// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Catalog retrieval for Aster: field-weighted BM25 over the bundled PSI catalog (accession/short name/title weighted
// above the objective), a small domain synonym table and topic boosts, so a question about the Moon or flame spread
// reaches BASS-II / SAFFIRE and the partial-gravity reports (FM2, LUCI; outside PSI) instead of whichever record shares
// a stray word. Answers quote stated objectives and report notes only.
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

interface Topic { re: RegExp; boost: Record<string, number>; external?: string[] }
/** Topic boosts (added to the BM25 score) and NASA reports outside PSI that a topic should surface. */
const TOPICS: Topic[] = [
  // Partial gravity: no PSI flight data exists; FM2 and LUCI are the NASA lunar-g reports (outside PSI).
  { re: /\b(moon|lunar|mars|martian|partial[- ]?g|1\/6|gravity|buoyan\w*|habitat)\b/, boost: { "PSI-25": 3, "PSI-100": 2.5, "PSI-99": 1.5 }, external: ["ntrs-20240015307", "ntrs-20250010653"] },
  // Solid flame spread / how long a fire lasts.
  { re: /\b(spread\w*|longer|last\w*|duration|burn\w*|fabric|sibal|solid\w*|textile|cotton|nomex|pmma|acrylic|grow\w*)\b/, boost: { "PSI-25": 3, "PSI-100": 3, "PSI-99": 2, "PSI-98": 1.5, "PSI-26": 1 } },
  { re: /\b(oxygen|o2|o₂|pressure|atmosphere|exploration)\b/, boost: { "PSI-20": 2.5, "PSI-25": 1.5 } },
  { re: /\b(droplet\w*|heptane|methanol|liquid|fuel)\b/, boost: { "PSI-69": 3, "PSI-68": 2 } },
  { re: /\b(extinguish\w*|suppress\w*|co2|co₂|agent|nitrogen|inert\w*)\b/, boost: { "PSI-69": 2, "PSI-26": 2, "PSI-25": 1.5 } },
  { re: /\b(smoke|aerosol|detector|alarm|particle\w*)\b/, boost: { "PSI-101": 3, "PSI-102": 2.5, "PSI-47": 2 } },
];

export function rankStudies(question: string, k = 3) {
  const terms = queryTerms(question);
  const q = question.toLowerCase();
  const topics = TOPICS.filter((t) => t.re.test(q));
  return DOCS.map((d) => ({ study: d.study, score: 3 * bm25(terms, d.name, avgName) + bm25(terms, d.body, avgBody) + topics.reduce((s, t) => s + (t.boost[d.study.accession] ?? 0), 0) }))
    .filter((x) => x.score > 0.5).sort((a, b) => b.score - a.score).slice(0, k);
}

export interface AsterSource { id: string; title: string; url: string; excerpt: string; external?: boolean }

export function answerLocally(question: string): { answer: string; sources: AsterSource[] } {
  const ranked = rankStudies(question, 3);
  const q = question.toLowerCase();
  const external = [...new Set(TOPICS.filter((t) => t.re.test(q)).flatMap((t) => t.external ?? []))].filter((id) => SOURCES[id]?.url).map((id) => ({
    id: id.startsWith("ntrs-") ? `NTRS ${id.slice(5)}` : id, title: SOURCES[id].title ?? id, url: SOURCES[id].url!,
    excerpt: SOURCES[id].note ?? "NASA technical report (outside PSI).", external: true,
  }));
  if (!ranked.length && !external.length) return { answer: "I couldn’t match that question to a study in the local catalog. Try asking about FLEX droplets, BASS-II flame spread, Saffire, or smoke aerosols.", sources: [] };
  return {
    answer: `These NASA records are the closest matches to your question (ranked by catalog search, not by an engine run). Their stated objectives are shown below.${external.length ? " PSI holds microgravity and 1 g tests only; the NTRS reports listed cover partial gravity (outside PSI)." : ""}`,
    sources: [
      ...ranked.map(({ study }) => ({ id: study.accession, title: study.title, url: study.psi_url, excerpt: (study.objective ?? "").trim().split(/\n\s*\n/)[0].slice(0, 420) })),
      ...external,
    ],
  };
}
