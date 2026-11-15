"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Adapted from the 21st.dev BackgroundPaths component: motion/react, deterministic durations (no Math.random in render →
// no hydration mismatch), ember (+1) and oxygen-blue (−1) streamline layers, paused off-screen, static under reduced motion.
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const N_PATHS = 36;

export function FloatingPaths({ position, active = true, className }: { position: 1 | -1; active?: boolean; className?: string }) {
  const reduce = useReducedMotion();
  const paths = Array.from({ length: N_PATHS }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));
  const animating = active && !reduce;
  return (
    <div className={cn("pointer-events-none absolute inset-0", position === 1 ? "text-ember" : "text-blue", className)} aria-hidden>
      <svg className="h-full w-full overflow-visible" style={{ willChange: animating ? "transform" : "auto" }} viewBox="0 0 696 316" fill="none" preserveAspectRatio="xMidYMid slice">
        {paths.map((p) => (
          <motion.path key={p.id} d={p.d} stroke="currentColor" strokeWidth={p.width} strokeOpacity={0.04 + p.id * 0.012}
            initial={reduce ? false : { pathLength: 0.3, opacity: 0.6 }}
            animate={animating ? { pathLength: 1, opacity: [0.3, 0.6, 0.3], pathOffset: [0, 1, 0] } : { pathLength: 1, opacity: 0.5 }}
            transition={animating ? { duration: 20 + ((p.id * 37) % 10), repeat: Number.POSITIVE_INFINITY, ease: "linear" } : { duration: 0 }} />
        ))}
      </svg>
    </div>
  );
}

/** Pause the streamlines when the element is off-screen. */
export function useOnScreen<T extends Element>() {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, on] as const;
}

/** Letter-by-letter spring reveal; renders the final state under reduced motion. */
export function LetterReveal({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((word, wi) => (
        <span key={wi} className="mr-[0.22em] inline-block whitespace-nowrap last:mr-0" aria-hidden>
          {word.split("").map((ch, li) => (
            <motion.span key={`${wi}-${li}`} className="inline-block bg-gradient-to-b from-ink to-mute bg-clip-text text-transparent"
              initial={reduce ? false : { y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ delay: wi * 0.1 + li * 0.03, type: "spring", stiffness: 150, damping: 25 }}>{ch}</motion.span>
          ))}
        </span>
      ))}
    </span>
  );
}

export function BackgroundPaths({ title = "The firefighter for space." }: { title?: string }) {
  const [ref, on] = useOnScreen<HTMLDivElement>();
  return (
    <div ref={ref} className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-bg">
      <div className="absolute inset-0"><FloatingPaths position={1} active={on} /><FloatingPaths position={-1} active={on} /></div>
      <div className="ea-grid absolute inset-0" aria-hidden />
      <div className="relative z-10 mx-auto px-4 text-center md:px-6">
        <h1 className="mb-8 text-[44px] font-semibold leading-[0.95] tracking-display sm:text-7xl md:text-[112px]"><LetterReveal text={title} /></h1>
        <HeroCtas />
      </div>
    </div>
  );
}

export function HeroCtas() {
  return (
    <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
      <div className="group relative inline-block overflow-hidden rounded-[10px] bg-gradient-to-b from-white/10 to-black/10 p-px backdrop-blur-lg">
        <Button asChild size="lg" className="w-full rounded-[9px] px-6 text-[15px] font-semibold">
          <Link href="/simulator?preset=iss-vs-lunar&run=1" data-testid="cta-run">Run the Moon-base fire <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">→</span></Link>
        </Button>
      </div>
      <div className="group relative inline-block overflow-hidden rounded-[10px] bg-gradient-to-b from-white/10 to-black/10 p-px backdrop-blur-lg">
        <Button asChild size="lg" variant="secondary" className="w-full rounded-[9px] bg-panel/90 px-6 text-[15px] backdrop-blur-md">
          <Link href="/evidence" data-testid="cta-evidence">See NASA&apos;s evidence</Link>
        </Button>
      </div>
    </div>
  );
}
