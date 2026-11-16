// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
export const asterDestinations = {
  overview: { label: "Overview", href: "/" },
  simulator: { label: "Simulator", href: "/simulator" },
  evidence: { label: "Evidence", href: "/evidence" },
  orbit: { label: "Earth vs. orbit", href: "/evidence#earth-vs-orbit" },
  coverage: { label: "Test coverage", href: "/evidence#where-evidence-stops" },
  match: { label: "Experiment Match", href: "/evidence#experiment-match" },
  methods: { label: "Methods", href: "/methods" },
  validation: { label: "Validation", href: "/methods#validation" },
  about: { label: "About", href: "/about" },
  team: { label: "Meet the team", href: "/about#team-title" },
} as const;

export type AsterDestination = (typeof asterDestinations)[keyof typeof asterDestinations];

const aliases: [RegExp, keyof typeof asterDestinations][] = [
  [/^(earth (?:vs\.?|versus) orbit)(?: comparison)?$/i, "orbit"],
  [/^(?:test coverage|evidence gaps?)$/i, "coverage"],
  [/^experiment match$/i, "match"],
  [/^validation$/i, "validation"],
  [/^(?:meet the team|team)$/i, "team"],
  [/^(?:home(?:page)?|overview)$/i, "overview"],
  [/^(?:simulator|simulation|scenario builder)$/i, "simulator"],
  [/^evidence$/i, "evidence"],
  [/^(?:methods|equations|formulas)$/i, "methods"],
  [/^(?:about(?: us)?|about emberatlas)$/i, "about"],
];

export function navigationRequest(question: string): AsterDestination | undefined {
  const target = question.trim()
    .match(/^(?:please\s+)?(?:(?:can|could|would) you\s+)?(?:open|go to|take me to|navigate to|show me)\s+(?:the\s+)?(.+?)(?:\s+(?:page|tab|section))?(?:\s+please)?[.!?]*$/i)?.[1];
  if (!target) return undefined;
  const match = aliases.find(([alias]) => alias.test(target));
  return match ? asterDestinations[match[1]] : undefined;
}
