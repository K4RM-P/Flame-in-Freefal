"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { AiRun } from "@/lib/ai/stream";
import { Orb } from "./kit";

export function ThinkingOrb({ run }: { run: AiRun }) {
  const reduce = useReducedMotion();
  const pending = run.streaming && !run.text;
  return (
    <AnimatePresence initial={!reduce}>
      {pending && (
        <motion.div key="thinking" className="ea-thinking-stage" aria-hidden="true"
          data-testid="aster-thinking-orb"
          initial={reduce ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={reduce ? { opacity: 0, height: 0, transition: { duration: 0 } } : { opacity: 0, height: 0 }}
          transition={{ duration: reduce ? 0 : .3, ease: "easeOut" }}>
          <div className="ea-thinking-stage__space">
            <motion.div className="ea-thinking-stage__orb"
              initial={reduce ? false : { scaleX: 1.65, scaleY: .4, y: 14, borderRadius: "32%" }}
              animate={{ scaleX: 1, scaleY: 1, y: 0, borderRadius: "50%" }}
              exit={reduce ? undefined : { scaleX: 1.35, scaleY: .35, y: 5 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 290, damping: 23 }}>
              <Orb state="thinking" size={36} />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
