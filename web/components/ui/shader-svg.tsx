"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MeshGradient = dynamic(
  () => import("@paper-design/shaders-react").then((module) => module.MeshGradient),
  { ssr: false },
);

let supportsWebGl: boolean | undefined;
function canRenderShader() {
  if (supportsWebGl === undefined) {
    const context = document.createElement("canvas").getContext("webgl2");
    supportsWebGl = context !== null;
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  }
  return supportsWebGl;
}

const colors = ["#FFB3D9", "#87CEEB", "#4A90E2", "#2C3E50", "#1A1A2E"];
const silhouette = "M230.809 115.385V249.411C230.809 269.923 214.985 287.282 194.495 288.411C184.544 288.949 175.364 285.718 168.26 280C159.746 273.154 147.769 273.461 139.178 280.23C132.638 285.384 124.381 288.462 115.379 288.462C106.377 288.462 98.1451 285.384 91.6055 280.23C82.912 273.385 70.9353 273.385 62.2415 280.23C55.7532 285.334 47.598 288.411 38.7246 288.462C17.4132 288.615 0 270.667 0 249.359V115.385C0 51.6667 51.6756 0 115.404 0C179.134 0 230.809 51.6667 230.809 115.385Z";

export function MeshGradientSVG({
  size = 40,
  state = "idle",
  interactive = false,
  className,
}: {
  size?: number;
  state?: "idle" | "thinking" | "speaking" | "offline";
  interactive?: boolean;
  className?: string;
}) {
  const id = useId();
  const shape = `aster-shape-${id}`;
  const fallback = `aster-fill-${id}`;
  const ref = useRef<SVGSVGElement>(null);
  const reduce = useReducedMotion();
  const [eyes, setEyes] = useState({ x: 0, y: 0 });
  const [webgl, setWebgl] = useState(false);

  useEffect(() => {
    if (!interactive || reduce || state === "offline") return;
    setWebgl(canRenderShader());
    let frame = 0;
    const clamp = (n: number) => Math.max(-8, Math.min(8, n));
    function follow(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = ref.current?.getBoundingClientRect();
        if (!bounds?.width) return;
        const x = clamp((event.clientX - bounds.left - bounds.width / 2) * 0.08);
        const y = clamp((event.clientY - bounds.top - bounds.height / 2) * 0.08);
        setEyes((prev) => prev.x === x && prev.y === y ? prev : { x, y });
      });
    }
    window.addEventListener("pointermove", follow, { passive: true });
    return () => {
      window.removeEventListener("pointermove", follow);
      cancelAnimationFrame(frame);
    };
  }, [interactive, reduce, state]);

  return (
    <svg ref={ref} aria-hidden="true" focusable="false" data-orb={state} data-state={state}
      data-interactive={interactive || undefined} className={cn("ai-mark", className)}
      width={size} height={size} viewBox="-8 -8 247 305">
      <defs>
        <clipPath id={shape}><path d={silhouette} /></clipPath>
        <linearGradient id={fallback} x2="0.82" y2="1">
          <stop stopColor={colors[0]} />
          <stop offset=".52" stopColor={colors[1]} />
          <stop offset="1" stopColor={colors[2]} />
        </linearGradient>
      </defs>
      <path d={silhouette} fill={`url(#${fallback})`} />
      {interactive && !reduce && webgl && state !== "offline" && (
        <foreignObject width="231" height="289" clipPath={`url(#${shape})`}>
          <MeshGradient colors={colors} className="h-full w-full" speed={0.5} maxPixelCount={4096} />
        </foreignObject>
      )}
      {[78, 153].map((cx) => (
        <motion.ellipse key={cx} className="ai-mascot-eye" fill="#151e32" rx="20" ry="30"
          cx={cx} cy={126} initial={false}
          animate={{ cx: cx + (interactive && !reduce ? eyes.x : 0), cy: 126 + (interactive && !reduce ? eyes.y : 0) }}
          transition={interactive && !reduce ? { type: "spring", stiffness: 150, damping: 20 } : { duration: 0 }} />
      ))}
    </svg>
  );
}
