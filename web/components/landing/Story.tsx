"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Pinned-visual story: the left column scrolls through four beats, the right panel is position: sticky and crossfades.
import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { sig } from "@/lib/ui/format";

export interface StoryFacts { mission: number; P_kPa: number; gravity: number; maxSolid: number | null; materials: { name: string; max: number | null }[]; note: string }
const pct = (x: number) => `${sig(x * 100, 3)}%`;

const BEATS = [
  { k: "alarm", eyebrow: "01 · Artemis II", title: "80,000 miles from home, Orion's fire alarm went off.", body: "On Artemis II a smoke alarm sounded in the Orion capsule. The crew could not open a window or walk outside.", cite: "Aerospace America (AIAA), Artemis II crew interview" },
  { k: "hidden", eyebrow: "02 · Microgravity", title: "In space, fire is hard to see and impossible to escape.", body: "Without gravity there is no buoyant plume: flames turn dim, blue and spherical, and smoke does not rise to a ceiling detector.", cite: "NASA Glenn, candle 1 g vs µg · GRC C-1998-485" },
  { k: "maya", eyebrow: "03 · The engineer", title: "Maya must approve every fabric in a Moon base.", body: "Maya (a persona) is a lunar-habitat fire-safety engineer. Her cabin air is oxygen-rich, low pressure, at lunar gravity.", cite: "NASA exploration atmosphere · data/missions.json" },
  { k: "gap", eyebrow: "04 · The gap", title: "Nobody can tell her if it's safe.", body: "No solid material in NASA's ISS combustion data has been burned at her oxygen level.", cite: "PSI materials index · data/materials.json" },
] as const;

export function Story({ f }: { f: StoryFacts }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const rail = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });
  const [beat, setBeat] = useState(0);
  // Active beat from the section's own rect (robust to jumps of several beats at once).
  useEffect(() => {
    const on = () => {
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const v = Math.min(0.9999, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
      setBeat(Math.floor(v * BEATS.length));
    };
    on(); window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return (
    <section id="story" ref={ref} className="relative border-t border-line" aria-label="Why EmberAtlas" style={{ height: `${BEATS.length * 100}vh` }}>
      <div className="mx-auto grid h-full max-w-6xl grid-cols-1 gap-8 px-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:px-6">
        <div className="relative">
          <div className="absolute bottom-0 left-0 top-0 hidden w-px bg-line md:block" aria-hidden>
            <motion.div className="h-full w-px origin-top bg-ember" style={{ scaleY: rail }} data-testid="story-rail" />
          </div>
          {BEATS.map((b, i) => (
            <div key={b.k} className="flex h-screen items-center md:pl-10">
              <div>
                <p className="ea-meta">{b.eyebrow}</p>
                <h2 className={`transition-colors duration-300 ${beat === i ? "text-ink" : "md:text-faint"} mt-3 text-[32px] font-semibold leading-[1.05] tracking-[-0.035em] md:text-[44px]`}>{b.title}</h2>
                <p className="mt-4 max-w-[46ch] text-[16px] leading-relaxed text-mute">{b.body}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.06em] text-faint">Source · {b.cite}</p>
                <div className="mt-6 md:hidden"><Panel k={b.k} f={f} /></div>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden md:block">
          <div className="sticky top-0 flex h-screen items-center" data-testid="story-sticky">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[12px] border border-line bg-panel">
              {BEATS.map((b, i) => (
                <div key={b.k} aria-hidden={beat !== i} data-active={beat === i || undefined}
                  className={`absolute inset-0 transition-[opacity,transform] duration-500 ease-out ${beat === i ? "scale-100 opacity-100" : "pointer-events-none scale-[.98] opacity-0"}`}>
                  <Panel k={b.k} f={f} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Panel({ k, f }: { k: (typeof BEATS)[number]["k"]; f: StoryFacts }) {
  const reduce = useReducedMotion();
  if (k === "alarm") return (
    <div className="ea-dots relative flex h-full min-h-[16rem] flex-col items-center justify-center gap-4 rounded-[12px] border border-line bg-panel p-6 md:border-0">
      <span className="relative grid h-20 w-20 place-items-center">
        {!reduce && <motion.span className="absolute inset-0 rounded-full border border-bad/60" animate={{ scale: [1, 1.6], opacity: [0.8, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }} />}
        <span className="h-4 w-4 rounded-full bg-bad" />
      </span>
      <span className="ea-pill" data-tone="bad">Smoke alarm · Orion</span>
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-faint">Artemis II · crewed lunar flyby</span>
    </div>
  );
  if (k === "hidden") return (
    <figure className="flex h-full min-h-[16rem] flex-col rounded-[12px] border border-line bg-panel md:border-0" data-testid="nasa-photo-placeholder">
      <div className="grid flex-1 place-items-center border-b border-dashed border-line text-center">
        <div className="flex flex-col items-center gap-2 text-faint"><ImageOff size={20} strokeWidth={1.5} /><span className="font-mono text-[11px] uppercase tracking-[0.08em]">NASA photo</span><span className="text-[12px]">Candle flame, 1 g vs microgravity</span></div>
      </div>
      <figcaption className="px-4 py-2 font-mono text-[11px] uppercase tracking-[0.06em] text-faint">NASA Glenn Research Center · GRC C-1998-485 · public domain</figcaption>
    </figure>
  );
  if (k === "maya") return (
    <div className="grid h-full min-h-[16rem] grid-cols-3 divide-x divide-line rounded-[12px] border border-line bg-panel md:border-0">
      {[["Oxygen", pct(f.mission), "mole fraction"], ["Pressure", `${sig(f.P_kPa, 3)} kPa`, "≈ half sea level"], ["Gravity", `${sig(f.gravity, 3)} g`, "lunar surface"]].map(([l, v, s]) => (
        <div key={l} className="flex flex-col justify-center gap-2 p-4 md:p-6">
          <span className="ea-meta">{l}</span><span className="num whitespace-nowrap text-[22px] font-semibold tracking-tight text-ink lg:text-[32px]">{v}</span><span className="text-[12px] text-faint">{s}</span>
        </div>
      ))}
    </div>
  );
  return <O2Gap f={f} />;
}

export function O2Gap({ f }: { f: StoryFacts }) {
  const rows = f.materials.filter((m) => m.max != null) as { name: string; max: number }[];
  const top = Math.max(f.mission, ...rows.map((r) => r.max)) * 1.1;
  const x = (v: number) => `${(v / top) * 100}%`;
  return (
    <div className="flex h-full min-h-[16rem] flex-col justify-center gap-3 rounded-[12px] border border-line bg-panel p-5 md:border-0 md:p-8" data-testid="o2-gap">
      <p className="ea-meta">Highest O₂ any solid was burned at (PSI) vs Moon-base air</p>
      <div className="relative mt-2 space-y-3">
        <div className="pointer-events-none absolute -bottom-2 -top-2 w-0.5 bg-ember" style={{ left: `calc(8.25rem + (100% - 8.25rem) * ${f.mission / top})` }} aria-hidden />
        {rows.map((r) => (
          <div key={r.name} className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-3 text-[12px]">
            <span className="truncate text-mute" title={r.name}>{r.name}</span>
            <div className="relative h-5 rounded-[3px] bg-surface2">
              <div className="h-full rounded-[3px] bg-[#5AA9FF]/70" style={{ width: x(r.max) }} />
              <span className="num absolute top-1/2 -translate-y-1/2 pl-1.5 text-[11px] text-ink" style={{ left: x(r.max) }}>{pct(r.max)}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-2 text-[12px] text-mute"><span className="inline-block h-3 w-px bg-ember" aria-hidden /> Moon base <span className="num text-ember-text">{pct(f.mission)}</span> · gap <span className="num text-warn">{f.maxSolid == null ? "∅" : `${sig((f.mission - f.maxSolid) * 100, 2)} points`}</span> beyond tested</p>
    </div>
  );
}
