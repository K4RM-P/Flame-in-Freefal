"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// First-run flow: selections are context only; the AI must source or request every scenario value.
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { GRAVITY, ScenarioSchema, type Scenario } from "@/lib/sim/types";
import { MATERIALS } from "./data";
import { useSim } from "./store";
import { spring } from "@/lib/ui/motion";

const CABINS = [
  ["custom", "I have a cabin in mind"],
  ["iss", "ISS / spacecraft cabin"],
  ["lunar", "Lunar habitat"],
  ["mars", "Mars habitat"],
] as const;

export function Onboarding() {
  const { set } = useSim();
  const [cabin, setCabin] = useState("custom");
  const [material, setMaterial] = useState("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);

  async function build() {
    setBusy(true); setError(null);
    const cabinLabel = CABINS.find(([id]) => id === cabin)?.[1] ?? cabin;
    const materialLabel = MATERIALS.find((m) => m.material_key === material)?.display_name ?? material;
    const text = [
      `Cabin context: ${cabinLabel}.`,
      materialLabel ? `Material of interest: ${materialLabel}.` : "Material is not chosen yet; ask me for it.",
      goal.trim(),
    ].filter(Boolean).join(" ");
    try {
      const res = await fetch("/api/scenario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `AI request failed (${res.status})`);
      const parsed = ScenarioSchema.safeParse(body.scenario);
      if (!parsed.success) throw new Error("The AI returned an incomplete scenario. Nothing was started; review the missing fields below.");
      set({ a: parsed.data, b: null, editing: "a", presetId: null, replay: false, ra: null, rb: null, frame: 0, interp: { state: "idle" }, runError: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI scenario builder unavailable.");
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-5xl py-8 sm:py-14">
      <motion.div className="max-w-2xl space-y-4" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring.gentle}>
        <p className="label">FIRST RUN · NO SCENARIO LOADED</p>
        <h1 className="display text-[clamp(2.4rem,7vw,5rem)] leading-[0.95]">Start with the question.</h1>
        <p className="measure text-[16px] text-mute">Choose the context you know, describe what you’re trying to find out, and EmberAtlas will draft the scenario. It will leave unsourced values empty for you to review—never inventing a cabin, threshold, or result.</p>
      </motion.div>
      <div className="mt-8 flex items-center gap-3 border-b border-line pb-4">
        <button type="button" className={`btn ${!manual ? "bg-surface2 border-accent" : ""}`} onClick={() => setManual(false)} aria-pressed={!manual}>Build with AI</button>
        <button type="button" className={`btn ${manual ? "bg-surface2 border-accent" : ""}`} onClick={() => setManual(true)} aria-pressed={manual}>Enter manually</button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
      {manual ? <motion.div key="manual" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={spring.default}><ManualSetup /></motion.div> : <motion.div key="ai" className="mt-8 grid gap-4 md:grid-cols-2" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={spring.default}>
        <section className="panel onboarding-card space-y-4 p-5">
          <div><p className="label">Context</p><h2 className="mt-1 text-[20px] font-semibold">What are you testing?</h2></div>
          <label className="block text-[13px]"><span className="mb-1 block text-mute">Cabin context</span><select className="w-full" value={cabin} onChange={(e) => setCabin(e.target.value)}>{CABINS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label className="block text-[13px]"><span className="mb-1 block text-mute">Material (optional)</span><select className="w-full" value={material} onChange={(e) => setMaterial(e.target.value)}><option value="">Let AI identify it from my description</option>{MATERIALS.map((m) => <option key={m.material_key} value={m.material_key}>{m.display_name}</option>)}</select></label>
        </section>
        <section className="panel onboarding-card space-y-4 p-5">
          <div><p className="label">Scenario Brief</p><h2 className="mt-1 text-[20px] font-semibold">What fire-safety question are you testing?</h2></div>
          <textarea className="min-h-40 w-full" value={goal} onChange={(e) => setGoal(e.target.value)} aria-label="Fire-safety question" placeholder="Example: Could a SIBAL curtain sustain burning in a lunar habitat with 34% oxygen?" />
          <button type="button" className="btn-accent w-full px-5 py-3 text-[16px]" disabled={busy || goal.trim().length < 3} onClick={build}>{busy ? "Building a sourced draft…" : "Build my scenario →"}</button>
          {error && <p className="text-[13px] text-warn" role="alert">{error}</p>}
        </section>
      </motion.div>}
      </AnimatePresence>
      <p className="mt-5 max-w-2xl text-[12px] text-faint">AI needs a server-side <code>OPENAI_API_KEY</code> in Vercel. If it is missing, this screen reports that directly.</p>
    </main>
  );
}

function ManualSetup() {
  const { set } = useSim();
  const [v, setV] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const put = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((x) => ({ ...x, [key]: e.target.value }));
  // Demo Numbers: a clearly labelled test case (user's request), not NASA measurements. Lunar exploration atmosphere,
  // SAFFIRE SIBAL sample size; volume, flow, detector distance and threshold are illustrative design inputs.
  const fillDemo = () => {
    setError(null);
    setV({ name: "Demo cabin fire", material: "sibal", o2: "34", pressure: "56.5", gravity: String(GRAVITY.moon), volume: "100", flow: "10", thickness: "0.37", length: "94", width: "40.6", distance: "1.5", threshold: "10", duration: "300" });
  };
  const number = (key: string) => v[key] === "" || v[key] == null ? null : Number(v[key]);
  function create() {
    const m = MATERIALS.find((x) => x.material_key === v.material);
    const required = ["name", "o2", "pressure", "gravity", "volume", "flow", "material", "thickness", "length", "width", "distance", "duration"];
    const missing = required.filter((x) => v[x] == null || v[x] === "");
    if (missing.length || !m) { setError(`Complete the required fields: ${missing.join(", ") || "material"}.`); return; }
    const scenario: Scenario = {
      name: v.name, preset_id: null,
      cabin: { x_o2: Number(v.o2) / 100, P_Pa: Number(v.pressure) * 1000, gravity_g: Number(v.gravity), V_m3: Number(v.volume), flow_m_s: Number(v.flow) / 100, fan_off_on_alarm: false },
      items: [{ id: "manual-1", material_key: m.material_key, thickness_m: Number(v.thickness) / 1000, length_m: Number(v.length) / 100, width_m: Number(v.width) / 100, ignite: m.has_burn_data, t_ignite_s: 0 }],
      detection: { type: (v.detector || "photoelectric") as "photoelectric" | "ionization", distance_m: Number(v.distance), threshold: number("threshold") == null ? null : Number(v.threshold) / 1e6 },
      suppression: { agent: "none", delay_s: 0, mass_kg: 0 }, t_end_s: Number(v.duration),
    };
    const parsed = ScenarioSchema.safeParse(scenario);
    if (!parsed.success) { setError("Check the numeric fields; every value must be positive and use the displayed units."); return; }
    set({ a: parsed.data, b: null, editing: "a", presetId: null, replay: false, ra: null, rb: null, frame: 0, interp: { state: "idle" }, runError: null });
  }
  return <section className="panel mt-8 space-y-5 p-4" data-testid="manual-setup">
    <div><p className="label">MANUAL SETUP · USER INPUTS</p><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="mt-1 text-[24px] font-semibold">Enter the scenario you want to run.</h2><p className="mt-1 text-[13px] text-mute">These values are treated as your design inputs unless you attach a source later. Blank fields never receive defaults.</p></div><button type="button" className="btn shrink-0" data-testid="demo-numbers" onClick={fillDemo}>Demo Numbers</button></div><p className="mt-2 text-[11px] text-warn">Demo Numbers fills a clearly marked test case; values are not NASA measurements.</p></div>
    <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
      <Field label="Scenario name" value={v.name} onChange={put("name")} required />
      <label className="text-[13px]"><span className="mb-1 block text-mute">Material</span><select className="w-full" value={v.material ?? ""} onChange={put("material")}><option value="">Select a PSI material</option>{MATERIALS.map((m) => <option key={m.material_key} value={m.material_key}>{m.display_name}</option>)}</select></label>
      <Field label="Oxygen" units="% mol" value={v.o2} onChange={put("o2")} type="number" required />
      <Field label="Pressure" units="kPa" value={v.pressure} onChange={put("pressure")} type="number" required />
      <label className="text-[13px]"><span className="mb-1 block text-mute">Gravity</span><select className="w-full" value={v.gravity ?? ""} onChange={put("gravity")}><option value="">Select gravity</option><option value={GRAVITY.ug}>Microgravity (0 g)</option><option value={GRAVITY.moon}>Moon (0.165 g)</option><option value={GRAVITY.mars}>Mars (0.378 g)</option><option value={GRAVITY.earth}>Earth (1 g)</option></select></label>
      <Field label="Cabin volume" units="m³" value={v.volume} onChange={put("volume")} type="number" required />
      <Field label="Airflow past item" units="cm/s" value={v.flow} onChange={put("flow")} type="number" required />
      <Field label="Thickness" units="mm" value={v.thickness} onChange={put("thickness")} type="number" required />
      <Field label="Length" units="cm" value={v.length} onChange={put("length")} type="number" required />
      <Field label="Width" units="cm" value={v.width} onChange={put("width")} type="number" required />
      <Field label="Detector distance" units="m" value={v.distance} onChange={put("distance")} type="number" required />
      <Field label="Detector threshold" units="mg/m³" value={v.threshold} onChange={put("threshold")} type="number" />
      <Field label="Simulation duration" units="s" value={v.duration} onChange={put("duration")} type="number" required />
    </div>
    <div className="flex flex-wrap items-center gap-3"><button type="button" className="btn-accent px-5 py-3" onClick={create}>Use these variables →</button>{error && <p className="text-[13px] text-warn" role="alert">{error}</p>}</div>
  </section>;
}

function Field({ label, units, value, onChange, type = "text", required = false }: { label: string; units?: string; value?: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; required?: boolean }) {
  return <label className="text-[13px]"><span className="mb-1 block text-mute">{label}{required && " *"}</span><span className="flex gap-2"><input className="num min-w-0 flex-1" type={type} value={value ?? ""} onChange={onChange} required={required} min={type === "number" ? "0" : undefined} />{units && <span className="w-14 self-center text-[12px] text-faint">{units}</span>}</span></label>;
}
