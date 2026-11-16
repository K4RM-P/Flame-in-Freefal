"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Find · Explain · Prevent bento. Hover shows a live micro-preview drawn from the build-time engine run.
import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useRef } from "react";
import { Flame, MessageSquareText, ShieldCheck } from "lucide-react";
import { sig } from "@/lib/ui/format";
import { Reveal } from "./motion";
const stagger = (i: number) => i * 0.06; // 60 ms reveal stagger

export interface BentoFacts {
  front: { t: number[]; a: number[]; b: number[] } | null; aName: string; bName: string;
  evidence: { accession: string; title: string; role: string }[];
  fixes: { title: string; before: string; after: string; basis: string; effect: number }[]; next: { condition: string } | null;
}

function Card({ children, className = "", i }: { children: React.ReactNode; className?: string; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const rx = useSpring(useMotionValue(0), { stiffness: 250, damping: 30 }), ry = useSpring(useMotionValue(0), { stiffness: 250, damping: 30 });
  const move = (e: React.PointerEvent) => {
    const el = ref.current; if (!el || reduce || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--x", `${px * 100}%`); el.style.setProperty("--y", `${py * 100}%`);
    rx.set((0.5 - py) * 4); ry.set((px - 0.5) * 4);
  };
  const leave = () => { rx.set(0); ry.set(0); };
  return (
    <Reveal delay={stagger(i)} className={className}>
      <motion.div ref={ref} onPointerMove={move} onPointerLeave={leave} style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
        className="group relative h-full overflow-hidden rounded-[12px] border border-line bg-panel p-6 transition-colors duration-200 hover:border-faint/40 md:p-8">
        <div className="ea-spot pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
        <div className="relative">{children}</div>
      </motion.div>
    </Reveal>
  );
}

export function Bento({ f }: { f: BentoFacts }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-28 md:px-6" aria-labelledby="ff-title">
      <Reveal><p className="ea-meta">The firefighter</p>
        <h2 id="ff-title" className="mt-3 max-w-[22ch] text-[36px] font-semibold leading-[1.05] tracking-[-0.04em] md:text-[56px]">Find. Explain. Prevent.</h2></Reveal>
      <div className="mt-12 grid gap-3 md:grid-cols-3 md:grid-rows-[auto_auto]">
        <Card i={0} className="md:col-span-2">
          <Head icon={<Flame size={20} strokeWidth={1.5} />} k="Find" t="Where a fire starts and how fast it spreads." />
          <FrontStrip f={f} />
        </Card>
        <Card i={1} className="md:row-span-2">
          <Head icon={<MessageSquareText size={20} strokeWidth={1.5} />} k="Explain" t="SI reads the simulation and says why, citing NASA experiments." />
          <div className="mt-6 space-y-3 rounded-[10px] border border-line bg-bg p-4 text-[13px]">
            <p className="ea-meta">Evidence the SI may cite</p>
            <ul className="space-y-2">{f.evidence.map((e) => (
              <li key={e.accession} className="flex items-center justify-between gap-2">
                <Link href={`/evidence#${e.accession.toLowerCase()}`} className="ea-pill hover:text-ink">{e.accession}</Link>
                <span className="truncate text-mute">{e.title}</span><span className="font-mono text-[11px] uppercase text-faint">{e.role}</span>
              </li>))}</ul>
            <p className="flex items-center gap-1.5 border-t border-line pt-3 text-[12px] text-mute"><ShieldCheck size={16} strokeWidth={1.5} className="text-ok" /> Numbers not in the engine output are removed</p>
          </div>
        </Card>
        <Card i={2} className="md:col-span-2">
          <Head icon={<ShieldCheck size={20} strokeWidth={1.5} />} k="Prevent" t="The design changes that cut risk most, plus the test that proves it." />
          <ol className="mt-6 space-y-2.5">
            {f.fixes.map((x, i) => {
              const top = Math.max(...f.fixes.map((y) => y.effect), 1e-9);
              return (
                <li key={x.title} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[13px]">
                  <span className="num text-faint">{i + 1}</span><span className="truncate">{x.title}</span>
                  <span className="num whitespace-nowrap text-mute">{x.before} → {x.after}</span>
                  <span /><span className="h-1 rounded-full bg-surface2"><span className="ea-bar block h-full origin-left rounded-full bg-ember transition-transform duration-500 group-hover:scale-x-100 md:scale-x-[.35]" style={{ width: `${(x.effect / top) * 100}%` }} /></span>
                  <span className="font-mono text-[11px] uppercase text-faint">{x.basis}</span>
                </li>
              );
            })}
            {!f.fixes.length && <li className="text-[13px] text-mute">No design gap with a measurable effect in this scenario.</li>}
          </ol>
          {f.next && <p className="mt-4 border-t border-line pt-3 text-[13px] text-mute"><span className="ea-meta mr-2">Next test</span>{f.next.condition}</p>}
        </Card>
      </div>
    </section>
  );
}

function Head({ icon, k, t }: { icon: React.ReactNode; k: string; t: string }) {
  return <div><div className="flex items-center gap-2 text-ember-text">{icon}<span className="font-mono text-[12px] uppercase tracking-[0.08em]">{k}</span></div><p className="mt-3 max-w-[34ch] text-[20px] font-semibold leading-snug tracking-[-0.02em]">{t}</p></div>;
}

/** Flame-front position of the igniting item over time, ISS (blue) vs Moon base (ember), from the engine trace. */
function FrontStrip({ f }: { f: BentoFacts }) {
  if (!f.front) return <p className="mt-6 text-[13px] text-mute">∅ No engine trace</p>;
  const { t, a, b } = f.front, W = 600, H = 90, tmax = t[t.length - 1] || 1, ymax = Math.max(...a, ...b) || 1;
  const line = (ys: number[]) => ys.map((y, i) => `${i ? "L" : "M"}${((t[i] / tmax) * W).toFixed(1)} ${(H - 6 - (y / ymax) * (H - 12)).toFixed(1)}`).join(" ");
  return (
    <figure className="mt-6">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" role="img" aria-label={`Flame front over time: ${f.aName} vs ${f.bName}`}>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={g * W} x2={g * W} y1={0} y2={H} stroke="rgb(var(--line))" />)}
        <path d={line(a)} fill="none" stroke="#5AA9FF" strokeWidth={1.5} className="ea-draw [stroke-dasharray:1200] [stroke-dashoffset:0] md:[stroke-dashoffset:1200] md:group-hover:[stroke-dashoffset:0] transition-[stroke-dashoffset] duration-[1200ms] ease-out" />
        <path d={line(b)} fill="none" stroke="#FF6B2C" strokeWidth={1.5} className="ea-draw [stroke-dasharray:1200] [stroke-dashoffset:0] md:[stroke-dashoffset:1200] md:group-hover:[stroke-dashoffset:0] transition-[stroke-dashoffset] duration-[1200ms] ease-out" />
      </svg>
      <figcaption className="mt-2 flex gap-4 font-mono text-[11px] uppercase tracking-[0.06em] text-faint"><span><span className="text-[#5AA9FF]">—</span> {f.aName}</span><span><span className="text-[#FF6B2C]">—</span> {f.bName}</span><span className="ml-auto">flame front · engine · {sig(tmax, 3)} s</span></figcaption>
    </figure>
  );
}
