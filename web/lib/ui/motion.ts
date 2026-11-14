// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Motion tokens (Apple-style springs). Animate only transform and opacity.
import type { Transition } from "motion/react";

export const spring = {
  default: { type: "spring", stiffness: 320, damping: 36, mass: 1 } as Transition,   // ~0.35 s, critically damped
  snappy: { type: "spring", stiffness: 600, damping: 40 } as Transition,
  gentle: { type: "spring", stiffness: 220, damping: 32 } as Transition,
};
export const tween = { fade: { duration: 0.15, ease: "easeOut" } as Transition, chart: 250 };
export const press = { whileHover: { scale: 1.02 }, whileTap: { scale: 0.98 }, transition: spring.snappy };
