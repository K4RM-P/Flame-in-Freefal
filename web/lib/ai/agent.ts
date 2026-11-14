// Tool-use agent loop on the Anthropic API with the numeric guard.
import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFS, runTool } from "./tools";
import { guard, stripUnsupported } from "./guard";

export const MODEL = "claude-sonnet-5-5";
export interface TraceItem { name: string; input: unknown; output: unknown }
export interface AgentAnswer { question: string; answer: string; trace: TraceItem[]; mode: "live" | "offline-demo"; guard: { ok: boolean; unsupported: number[]; regenerated: boolean } }

export async function askAgent(question: string, system: string, onTrace?: (t: TraceItem) => void, apiKey = process.env.ANTHROPIC_API_KEY): Promise<AgentAnswer> {
  const client = new Anthropic({ apiKey });
  const trace: TraceItem[] = [];
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];
  let text = "";
  for (let turn = 0; turn < 8; turn++) {
    const res = await client.messages.create({ model: MODEL, max_tokens: 1500, system, tools: TOOL_DEFS as Anthropic.Tool[], messages });
    messages.push({ role: "assistant", content: res.content });
    const uses = res.content.filter((c): c is Anthropic.ToolUseBlock => c.type === "tool_use");
    text = res.content.filter((c): c is Anthropic.TextBlock => c.type === "text").map((c) => c.text).join("\n");
    if (res.stop_reason !== "tool_use" || !uses.length) break;
    const results: Anthropic.ToolResultBlockParam[] = uses.map((u) => {
      const output = runTool(u.name, u.input);
      const item = { name: u.name, input: u.input, output };
      trace.push(item); onTrace?.(item);
      return { type: "tool_result", tool_use_id: u.id, content: JSON.stringify(output).slice(0, 12000) };
    });
    messages.push({ role: "user", content: results });
  }
  const outs = trace.map((t) => t.output);
  let g = guard(text, outs, question);
  let regenerated = false;
  if (!g.ok) {
    regenerated = true;
    messages.push({ role: "user", content: `Your answer contains numbers not present in any tool output: ${g.unsupported.join(", ")}. Rewrite the answer using only numbers from tool outputs (unit conversions allowed). Do not call tools.` });
    const res = await client.messages.create({ model: MODEL, max_tokens: 1500, system, messages });
    text = res.content.filter((c): c is Anthropic.TextBlock => c.type === "text").map((c) => c.text).join("\n");
    g = guard(text, outs, question);
    if (!g.ok) text = stripUnsupported(text, outs, question);
  }
  return { question, answer: text, trace, mode: "live", guard: { ok: g.ok, unsupported: g.unsupported, regenerated } };
}
