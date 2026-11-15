"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Heading anchor: copies the section URL, with a check-morph and a toast.
import { AnimatePresence, motion } from "motion/react";
import { Check, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/sonner";

export function CopyLink({ id, label }: { id: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="ea-anchor inline-grid h-6 w-6 place-items-center rounded align-middle hover:text-ink" aria-label={`Copy link to ${label}`} title="Copy link"
      onClick={async () => {
        const url = `${location.origin}${location.pathname}#${id}`;
        try { await navigator.clipboard.writeText(url); setOk(true); toast.success("Link copied", { description: url }); setTimeout(() => setOk(false), 1400); }
        catch { toast.error("Copy failed", { description: "Clipboard is blocked in this browser." }); }
      }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={String(ok)} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.15 }}>
          {ok ? <Check size={16} strokeWidth={1.5} className="text-ok" /> : <Link2 size={16} strokeWidth={1.5} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/** Scroll-spy: the id of the section nearest the top of the viewport. */
export function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const els = ids.map((i) => document.getElementById(i)).filter(Boolean) as HTMLElement[];
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive(vis[0].target.id);
    }, { rootMargin: "-80px 0px -60% 0px" });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [ids]);
  return active;
}
