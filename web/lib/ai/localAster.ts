// SI-assisted: written with Codex (OpenAI); see README "Use of AI (SI)".
import catalog from "@/data/psi_catalog.json";

const studies = Object.values(catalog.investigations);
const stopWords = new Set(["about", "what", "was", "were", "did", "can", "which", "does", "with", "from", "could", "would", "tell", "explain", "nasa", "experiment", "experiments", "study", "data", "fire", "the", "are", "how"]);

export function answerLocally(question: string) {
  const query = question.toLowerCase();
  const terms = [...new Set(query.match(/[a-z0-9-]+/g) ?? [])].filter((term) => term.length > 2 && !stopWords.has(term));
  const ranked = studies.map((study) => {
    const name = `${study.accession} ${study.short_name} ${study.title}`.toLowerCase();
    const objective = (study.objective ?? "").toLowerCase();
    const score = terms.reduce((sum, term) => sum + (name.split(/\s+/).includes(term) ? 8 : name.includes(term) ? 4 : objective.includes(term) ? 1 : 0), 0);
    return { study, score };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, 2);

  if (!ranked.length) return { answer: "I couldn’t match that question to a study in the local catalog. Try asking about FLEX droplets, BASS-II flame spread, Saffire, or smoke aerosols.", sources: [] };
  return {
    answer: "These NASA records are the closest matches. Their stated objectives are shown below.",
    sources: ranked.map(({ study }) => ({
      id: study.accession,
      title: study.title,
      url: study.psi_url,
      excerpt: (study.objective ?? "").trim().split(/\n\s*\n/)[0].slice(0, 420),
    })),
  };
}
