// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Deterministic catalog retrieval for Aster: keyword score over the bundled PSI catalog plus topic boosts, so a
// question about the Moon or flame spread reaches BASS-II / Saffire and the partial-gravity reports (FM2, LUCI;
// outside PSI) instead of whichever record shares a stray word.
import catalog from "@/data/psi_catalog.json";
import sources from "@/data/sources.json";

const studies = Object.values(catalog.investigations);
const stopWords = new Set(["about", "what", "was", "were", "did", "can", "which", "does", "with", "from", "could", "would", "tell", "explain", "nasa", "experiment", "experiments", "study", "data", "fire", "the", "are", "how", "why", "this", "that", "run", "last", "longer", "more", "than", "there", "here", "much", "out"]);

interface Topic { re: RegExp; boost: Record<string, number>; external?: string[] }
const TOPICS: Topic[] = [
  // Partial gravity: no PSI flight data exists; FM2 and LUCI are the NASA lunar-g reports (outside PSI).
  { re: /\b(moon|lunar|mars|martian|partial[- ]?g|1\/6|gravity|buoyan\w*|habitat)\b/, boost: { "PSI-25": 6, "PSI-100": 5, "PSI-99": 3 }, external: ["ntrs-20240015307", "ntrs-20250010653"] },
  // Solid flame spread / how long a fire lasts.
  { re: /\b(spread\w*|longer|last\w*|duration|burn\w*|fabric|sibal|solid\w*|textile|cotton|nomex|pmma|acrylic|grow\w*|out)\b/, boost: { "PSI-25": 6, "PSI-100": 6, "PSI-99": 4, "PSI-98": 3, "PSI-26": 2 } },
  { re: /\b(oxygen|o2|o₂|pressure|atmosphere|exploration)\b/, boost: { "PSI-20": 5, "PSI-25": 3 } },
  { re: /\b(droplet\w*|heptane|methanol|liquid|fuel)\b/, boost: { "PSI-69": 6, "PSI-68": 4 } },
  { re: /\b(extinguish\w*|suppress\w*|co2|co₂|agent|nitrogen|inert\w*)\b/, boost: { "PSI-69": 4, "PSI-26": 4, "PSI-25": 3 } },
  { re: /\b(smoke|aerosol|detector|alarm|particle\w*)\b/, boost: { "PSI-101": 6, "PSI-102": 5, "PSI-47": 4 } },
];

type Src = { title: string; url: string; note?: string };
const SOURCES = sources as unknown as Record<string, Src>;

export interface AsterSource { id: string; title: string; url: string; excerpt: string; external?: boolean }

export function answerLocally(question: string): { answer: string; sources: AsterSource[] } {
  const query = question.toLowerCase();
  const terms = [...new Set(query.match(/[a-z0-9-]+/g) ?? [])].filter((term) => term.length > 2 && !stopWords.has(term));
  const topics = TOPICS.filter((t) => t.re.test(query));
  const ranked = studies.map((study) => {
    const name = `${study.accession} ${study.short_name} ${study.title}`.toLowerCase();
    const objective = (study.objective ?? "").toLowerCase();
    let score = terms.reduce((sum, term) => sum + (name.split(/\s+/).includes(term) ? 8 : name.includes(term) ? 4 : objective.includes(term) ? 1 : 0), 0);
    for (const t of topics) score += t.boost[study.accession] ?? 0;
    return { study, score };
  }).filter(({ score }) => score > 1).sort((a, b) => b.score - a.score).slice(0, 3);

  const external = [...new Set(topics.flatMap((t) => t.external ?? []))].filter((id) => SOURCES[id]).map((id) => ({
    id: id.startsWith("ntrs-") ? `NTRS ${id.slice(5)}` : id, title: SOURCES[id].title, url: SOURCES[id].url,
    excerpt: SOURCES[id].note ?? "NASA technical report (outside PSI).", external: true,
  }));

  if (!ranked.length && !external.length) return { answer: "I couldn’t match that question to a study in the local catalog. Try asking about FLEX droplets, BASS-II flame spread, Saffire, or smoke aerosols.", sources: [] };
  return {
    answer: "These NASA records are the closest matches. Their stated objectives are shown below.",
    sources: [
      ...ranked.map(({ study }) => ({
        id: study.accession,
        title: study.title,
        url: study.psi_url,
        excerpt: (study.objective ?? "").trim().split(/\n\s*\n/)[0].slice(0, 420),
      })),
      ...external,
    ],
  };
}
