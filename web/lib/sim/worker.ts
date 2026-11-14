// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Web Worker entry: runs the Monte Carlo off the main thread.
import { simulate } from "./engine";
import type { Scenario } from "./types";

self.onmessage = (e: MessageEvent<{ id: number; scenario: Scenario; mc?: number; seed?: number }>) => {
  const { id, scenario, mc, seed } = e.data;
  try { (self as unknown as Worker).postMessage({ id, ok: true, result: simulate(scenario, { mc, seed }) }); }
  catch (err) { (self as unknown as Worker).postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err), code: (err as { code?: string })?.code }); }
};
