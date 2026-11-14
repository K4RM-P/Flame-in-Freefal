// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Build web/data/cache/golden.json: live Claude answers if ANTHROPIC_API_KEY is set, else offline tool-composed answers.
import fs from "node:fs";
import path from "node:path";
import { GOLDEN, offlineAnswer } from "../lib/ai/golden";
import { askAgent } from "../lib/ai/agent";

async function main() {
  const system = fs.readFileSync(path.join(__dirname, "../lib/ai/system.md"), "utf8");
  const out = [];
  for (const g of GOLDEN) {
    let a = offlineAnswer(g);
    if (process.env.ANTHROPIC_API_KEY) {
      try { a = await askAgent(g.q, system); } catch (e) { console.error(`live failed for Q${g.id}, using offline:`, e); }
    }
    out.push({ id: g.id, ...a });
    console.log(`Q${g.id} [${a.mode}] guard ok=${a.guard.ok} tools=${a.trace.map((t) => t.name).join(",")}`);
  }
  fs.writeFileSync(path.join(__dirname, "../data/cache/golden.json"), JSON.stringify(out, null, 1));
}
main();
