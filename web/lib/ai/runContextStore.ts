// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// The run currently on screen in the simulator, published for Aster (so questions are answered from the run).
import { create } from "zustand";
import type { AsterContext } from "./asterContext";

export const useRunContext = create<{ ctx: AsterContext | null; set: (ctx: AsterContext | null) => void }>((set) => ({ ctx: null, set: (ctx) => set({ ctx }) }));
