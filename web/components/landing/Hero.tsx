"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown } from "lucide-react";
import { FloatingPaths, HeroCtas, LetterReveal, useOnScreen } from "@/components/ui/background-paths";

export const ONE_LINER = "EmberAtlas shows where and how a fire would start in your spacecraft, and which design change prevents it. Built on NASA's ISS fire data, explained by AI.";

export function Hero({ status }: { status: { experiments: number; rows: number; mismatches: number; compared: number } }) {
  const [ref, on] = useOnScreen<HTMLElement>();
  const reduce = useReducedMotion();
  const fade = (d: number) => (reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay: d, ease: [0.16, 1, 0.3, 1] as const } });
  return (
    <section ref={ref} className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-bg text-ink transition-colors duration-200" aria-labelledby="landing-title" data-testid="hero">
      <div className="absolute inset-0"><FloatingPaths position={1} active={on} /><FloatingPaths position={-1} active={on} /></div>
      <div className="ea-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="ea-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 pt-24 text-center md:px-6">
        <motion.p {...fade(0)} className="font-mono text-[11px] uppercase tracking-[0.08em] text-mute">For spacecraft and lunar-habitat designers · NASA Space Apps 2026 · Flame in Freefall</motion.p>
        <h1 id="landing-title" className="mt-6 text-[44px] font-semibold leading-[0.95] tracking-display sm:text-7xl lg:text-[112px]">
          <LetterReveal text="The firefighter for space." accentWord="firefighter" />
        </h1>
        <motion.p {...fade(0.9)} className="mt-6 max-w-[58ch] text-[16px] leading-relaxed text-mute md:text-[18px]">{ONE_LINER}</motion.p>
        <motion.div {...fade(1.05)} className="mt-8 w-full sm:w-auto"><HeroCtas /></motion.div>
        <motion.ol {...fade(1.12)} className="mt-8 grid w-full max-w-3xl grid-cols-2 gap-2 text-left sm:grid-cols-4" aria-label="How it works" data-testid="hero-steps">
          {[["Describe", "your cabin in words"], ["Burn", "it with NASA ISS data"], ["Ask Aster", "why, with citations"], ["Fix", "it before launch"]].map(([k, d], i) => (
            <li key={k} className="rounded-[8px] border border-line bg-panel/70 px-3 py-2 backdrop-blur-sm">
              <span className="num text-[11px] text-faint">{String(i + 1).padStart(2, "0")}{i < 3 ? " →" : ""}</span>
              <p className="text-[14px] font-semibold">{k}</p><p className="text-[12px] text-mute">{d}</p>
            </li>))}
        </motion.ol>
        <motion.ul {...fade(1.2)} className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.08em] text-faint" aria-label="Data status" data-testid="hero-status">
          <li><span className="tabular-nums text-ink">{status.experiments}</span> NASA PSI combustion investigations</li>
          <li aria-hidden>·</li>
          <li><span className="tabular-nums text-ink">{status.rows.toLocaleString("en-US")}</span> NASA data rows</li>
          <li aria-hidden>·</li>
          <li><span className="tabular-nums text-ok">{status.mismatches}</span> mismatches in <span className="tabular-nums text-ink">{status.compared.toLocaleString("en-US")}</span> checked values</li>
        </motion.ul>
      </div>
      <a href="#story" className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 md:flex flex-col items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-faint hover:text-ink">
        Scroll<motion.span animate={reduce ? undefined : { y: [0, 4, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}><ArrowDown size={16} strokeWidth={1.5} /></motion.span>
      </a>
    </section>
  );
}
