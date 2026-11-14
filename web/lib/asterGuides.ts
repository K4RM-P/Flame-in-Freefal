// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Optional per-page Aster guides: a short explanation plus two next steps. Static text, works with local Aster
// (no OpenAI key, no network). The "✦ Ask Aster about this page" button pushes one into the existing chat.
import { create } from "zustand";

export type GuidePage = "overview" | "simulator" | "match" | "methods";
export interface Guide { page: GuidePage; title: string; text: string; steps: { label: string; href: string }[] }

export const GUIDES: Record<GuidePage, Guide> = {
  overview: {
    page: "overview", title: "Overview",
    text: "New to EmberAtlas? Start a simulation or see how we checked our model against NASA’s FLEX data.",
    steps: [{ label: "Start a simulation", href: "/simulator" }, { label: "See the FLEX validation check", href: "/methods#validation" }],
  },
  simulator: {
    page: "simulator", title: "Simulator",
    text: "Choose a cabin and a material, then run the scenario. Use playback to follow the cabin view and open Evidence to see the sources behind the result.",
    steps: [{ label: "How a run works, step by step", href: "/methods#loop" }, { label: "Find NASA tests close to this design", href: "/match" }],
  },
  match: {
    page: "match", title: "Experiment Match",
    text: "Describe what you want to test. Open a matching NASA study to see what conditions it covered.",
    steps: [{ label: "How NASA data is used", href: "/methods#data" }, { label: "Run this design in the simulator", href: "/simulator" }],
  },
  methods: {
    page: "methods", title: "Methods",
    text: "Open a formula card to see what it calculates, where the simulator uses it, and what evidence supports it.",
    steps: [{ label: "Models at a glance", href: "/methods#overview" }, { label: "Validation results", href: "/methods#validation" }],
  },
};

/** Request channel from page buttons to the single Aster dialog in the shell. `n` changes on every request. */
export const useAsterGuide = create<{ request: { guide: Guide; n: number } | null; ask: (page: GuidePage) => void }>((set, get) => ({
  request: null,
  ask: (page) => set({ request: { guide: GUIDES[page], n: (get().request?.n ?? 0) + 1 } }),
}));
