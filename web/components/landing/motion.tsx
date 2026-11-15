"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Landing motion primitives: scroll reveal (fade + 24 px, 60 ms stagger) and a count-up that renders the final value
// on the server and under reduced motion.
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function Reveal({ children, className, delay = 0, as = "div" }: { children: React.ReactNode; className?: string; delay?: number; as?: "div" | "li" | "section" }) {
  const reduce = useReducedMotion();
  const M = motion[as];
  return (
    <M className={className} initial={reduce ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay }}>{children}</M>
  );
}


export function CountUp({ value, format, className }: { value: number; format: (v: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || reduce) return;
    const c = animate(0, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => { el.textContent = format(v); } });
    return () => c.stop();
  }, [inView, reduce, value, format]);
  return <span ref={ref} className={cn("num tabular-nums", className)}>{format(value)}</span>;
}
