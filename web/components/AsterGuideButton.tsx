"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// "✦ Ask Aster about this page": opens the existing Aster chat with this page's guide (local, no key needed).
import { useAsterGuide, type GuidePage } from "@/lib/asterGuides";

export function AsterGuideButton({ page, className = "" }: { page: GuidePage; className?: string }) {
  const ask = useAsterGuide((s) => s.ask);
  return (
    <button type="button" className={`aster-guide-btn ${className}`} data-testid={`aster-guide-${page}`} onClick={() => ask(page)}
      aria-haspopup="dialog" aria-controls="aster-dialog">
      <span aria-hidden>✦</span> Ask Aster about this page
    </button>
  );
}
