// SI-assisted: written with Codex (OpenAI); see README "Use of AI (SI)".
import type { AgentAnswer, TraceItem } from "./agent";
import { TOOL_DEFS, runTool } from "./tools";
import { guard, stripUnsupported } from "./guard";

type Item = { type: string; name?: string; arguments?: string; call_id?: string; content?: { type: string; text?: string }[] };
export async function askOpenAI(question: string, system: string, onTrace: (item: TraceItem) => void, key: string): Promise<AgentAnswer> {
  const input: unknown[] = [{ role: "user", content: question }];
  const trace: TraceItem[] = [];
  const tools = TOOL_DEFS.map(({ name, description, input_schema }) => ({
    type: "function", name, description, parameters: input_schema, strict: false,
  }));
  for (let turn = 0; turn < 8; turn++) {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        store: false,
        instructions: "You are Aster, the EmberAtlas research assistant.\n" + system,
        input, tools, tool_choice: turn === 0 ? "required" : "auto",
        max_output_tokens: 1500,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
    const { output } = await response.json() as { output: Item[] };
    const calls = output.filter(item => item.type === "function_call");
    if (!calls.length) {
      const text = output.flatMap(item => item.content ?? []).filter(item => item.type === "output_text").map(item => item.text).join("\n");
      if (!text || !trace.length) throw new Error("Missing grounded answer");
      const evidence = trace.map(item => item.output);
      const result = guard(text, evidence, question);
      return { question, answer: result.ok ? text : stripUnsupported(text, evidence, question), trace,
        mode: "live", guard: { ...result, regenerated: false } };
    }
    input.push(...output);
    for (const call of calls) {
      const args: unknown = JSON.parse(call.arguments ?? "{}");
      const result = runTool(call.name ?? "", args);
      const evidence = JSON.stringify(result ?? null);
      const bounded = evidence.length > 12000 ? { error: "Tool output exceeded the context limit. Use a narrower query." } : result;
      const item = { name: call.name ?? "", input: args, output: bounded };
      trace.push(item);
      onTrace(item);
      input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(bounded ?? null) });
    }
  }
  throw new Error("Tool call limit reached");
}
