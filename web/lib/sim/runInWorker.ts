// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Client helper: run simulate() in a Web Worker; falls back to the main thread where workers are unavailable.
import { simulate } from "./engine";
import type { Scenario, SimResult } from "./types";

let seq = 0;
export function runInWorker(scenario: Scenario, opts: { mc?: number; seed?: number } = {}): Promise<SimResult> {
  if (typeof window === "undefined" || typeof Worker === "undefined") return Promise.resolve().then(() => simulate(scenario, opts));
  return new Promise((resolve, reject) => {
    let w: Worker;
    try { w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" }); }
    catch { resolve(simulate(scenario, opts)); return; }
    const id = ++seq;
    w.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: SimResult; error?: string }>) => {
      if (e.data.id !== id) return;
      w.terminate();
      if (e.data.ok && e.data.result) resolve(e.data.result); else reject(new Error(e.data.error ?? "simulation failed"));
    };
    w.onerror = (e) => { w.terminate(); reject(new Error(e.message || "worker error")); };
    w.postMessage({ id, scenario, ...opts });
  });
}
