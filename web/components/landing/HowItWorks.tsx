"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Horizontal sticky scroll: the section pins (position: sticky, explicit height) while five steps slide left and
// a connecting line draws with scroll progress. Below md it is a plain vertical list.
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Box, Cpu, MessageSquareText, ShieldCheck, RefreshCw } from "lucide-react";

const STEPS = [
  { k: "Describe", t: "SI builds the cabin", d: "Describe the module in plain words. The SI drafts a scenario from the material library; anything unsourced stays empty for you to fill.", icon: Box },
  { k: "Simulate", t: "NASA-calibrated engine", d: "A well-mixed cabin zone with a flame front per item, its spread rate calibrated on a SAFFIRE flight test (n = 1, so small n) and run 200× for uncertainty bands.", icon: Cpu },
  { k: "Interpret", t: "SI explains, cites PSI", d: "The SI reads only the engine output and the ranked NASA evidence, and cites the experiment behind each claim.", icon: MessageSquareText },
  { k: "Prevent", t: "Biggest design change", d: "Sensitivity runs rank the inputs that move the outcome most, and the next test names the condition to fly.", icon: ShieldCheck },
  { k: "Ask & improve", t: "Loop back", d: "Ask a follow-up, change the cabin, re-run. Every answer stays tied to a run you can export.", icon: RefreshCw },
] as const;
const N = STEPS.length;

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // Track = N cards of 44vw + gaps; slide so the last card ends near the right edge.
  const x = useTransform(scrollYProgress, [0, 1], ["0vw", `-${N * 44 - 88}vw`]);
  const draw = useTransform(scrollYProgress, [0.02, 0.95], [0, 1]);
  return (
    <section ref={ref} className="relative border-t border-line md:h-[400vh]" aria-labelledby="how-title" data-testid="how">
      <div className="md:sticky md:top-0 md:flex md:h-screen md:flex-col md:justify-center md:overflow-hidden" data-testid="how-sticky">
        <div className="mx-auto w-full max-w-6xl px-4 pt-24 md:px-6 md:pt-0">
          <p className="ea-meta">How it works</p>
          <h2 id="how-title" className="mt-3 text-[36px] font-semibold leading-[1.05] tracking-[-0.04em] md:text-[56px]">Five steps, one loop.</h2>
        </div>
        <div className="relative mt-10 md:mt-14">
          <motion.ol className="flex flex-col gap-3 px-4 md:w-max md:flex-row md:gap-[2vw] md:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] md:[transform:translateX(var(--how-x))]" style={{ "--how-x": x } as never} data-how-track>
            <svg className="pointer-events-none absolute left-0 top-[30px] hidden h-2 w-full md:block" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden>
              <line x1="0" y1="1" x2="100" y2="1" stroke="rgb(var(--line))" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <motion.line x1="0" y1="1" x2="100" y2="1" stroke="#FF6B2C" strokeWidth="2" vectorEffect="non-scaling-stroke" style={{ pathLength: draw }} />
            </svg>
            {STEPS.map((s, i) => (
              <li key={s.k} className="relative flex md:w-[42vw] md:max-w-[34rem]">
                <div className="flex w-full flex-col gap-4 rounded-[12px] border border-line bg-panel p-6 md:p-8">
                  <div className="flex items-center gap-3">
                    <span className="grid h-[60px] w-[60px] place-items-center rounded-full border border-line bg-bg text-ember-text"><s.icon size={20} strokeWidth={1.5} /></span>
                    <span className="num text-[12px] text-faint">{String(i + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}</span>
                  </div>
                  <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-ember-text">{s.k}</p>
                  <p className="text-[24px] font-semibold tracking-[-0.03em]">{s.t}</p>
                  <p className="max-w-[44ch] text-[15px] leading-relaxed text-mute">{s.d}</p>
                </div>
              </li>
            ))}
          </motion.ol>
        </div>
        <p className="mx-auto mt-10 w-full max-w-6xl px-4 pb-24 text-[15px] text-mute md:px-6 md:pb-0">
          <ShieldCheck size={16} strokeWidth={1.5} className="mr-1.5 inline text-ok" />
          The SI can&apos;t make things up: every number is checked against the simulation, and every source is shown, from the PSI file and line to the design inputs that are not NASA data.
        </p>
      </div>
    </section>
  );
}
