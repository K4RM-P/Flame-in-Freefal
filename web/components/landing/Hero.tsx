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
    <section ref={ref} className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-[#0A0A0A] text-[#EDEDED]" aria-labelledby="landing-title" data-testid="hero">
      <div className="absolute inset-0"><FloatingPaths position={1} active={on} /><FloatingPaths position={-1} active={on} /></div>
      <div className="ea-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="ea-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-4 pt-24 text-center md:px-6">
        <motion.p {...fade(0)} className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#A1A1A1]">NASA Space Apps 2026 · Flame in Freefall</motion.p>
        <h1 id="landing-title" className="mt-6 text-[44px] font-semibold leading-[0.95] tracking-display sm:text-7xl lg:text-[112px]">
          <LetterReveal text="The firefighter for space." />
        </h1>
        <motion.p {...fade(0.9)} className="mt-6 max-w-[58ch] text-[16px] leading-relaxed text-[#A1A1A1] md:text-[18px]">{ONE_LINER}</motion.p>
        <motion.div {...fade(1.05)} className="mt-8 w-full sm:w-auto"><HeroCtas /></motion.div>
        <motion.ul {...fade(1.2)} className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8F8F8F]" aria-label="Data status" data-testid="hero-status">
          <li><span className="tabular-nums text-[#EDEDED]">{status.experiments}</span> ISS fire experiments</li>
          <li aria-hidden>·</li>
          <li><span className="tabular-nums text-[#EDEDED]">{status.rows.toLocaleString("en-US")}</span> NASA data rows</li>
          <li aria-hidden>·</li>
          <li><span className="tabular-nums text-[#3DD68C]">{status.mismatches}</span> mismatches in <span className="tabular-nums text-[#EDEDED]">{status.compared.toLocaleString("en-US")}</span> checked values</li>
        </motion.ul>
      </div>
      <a href="#story" className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8F8F8F] hover:text-[#EDEDED]">
        Scroll<motion.span animate={reduce ? undefined : { y: [0, 4, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}><ArrowDown size={16} strokeWidth={1.5} /></motion.span>
      </a>
    </section>
  );
}
