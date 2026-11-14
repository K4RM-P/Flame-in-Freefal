"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { useEffect, useRef } from "react";

/** Slow background mesh for the hero; pauses off-screen and under prefers-reduced-motion (motion-safe). */
export function Mesh() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { el.style.animationPlayState = e.isIntersecting ? "running" : "paused"; });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <>
      <style>{`@keyframes mesh{0%{background-position:0% 0%}100%{background-position:100% 60%}}`}</style>
      <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-80 motion-safe:animate-[mesh_24s_ease-in-out_infinite_alternate]"
        style={{ background: "radial-gradient(40% 50% at 70% 45%, rgba(76,154,255,0.22), transparent 70%), radial-gradient(28% 36% at 74% 52%, rgba(255,107,53,0.18), transparent 70%), radial-gradient(60% 60% at 20% 80%, rgba(76,154,255,0.06), transparent 70%)", backgroundSize: "140% 140%" }} />
    </>
  );
}
