"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { spring } from "@/lib/ui/motion";

export function Popover({ open, onClose, children, align = "left", width = 380 }: { open: boolean; onClose: () => void; children: React.ReactNode; align?: "left" | "right"; width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const click = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as HTMLElement).closest("[data-popover-trigger]")) onClose(); };
    window.addEventListener("keydown", key); window.addEventListener("pointerdown", click);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("pointerdown", click); };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div ref={ref} role="dialog" initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={spring.snappy}
          className={`absolute top-full z-50 mt-2 max-w-[calc(100vw-24px)] border border-line bg-panel p-4 shadow-2xl ${align === "right" ? "right-0" : "left-0"}`} style={{ width, borderRadius: 8 }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
