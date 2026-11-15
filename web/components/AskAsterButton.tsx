"use client";

import { ASTER_CONTEXT_EVENT, type AsterContext } from "@/lib/ai/asterContext";

export function AskAsterButton({ context, children }: { context: AsterContext; children: string }) {
  return <button type="button" className="btn" onClick={() => window.dispatchEvent(new CustomEvent(ASTER_CONTEXT_EVENT, { detail: context }))}>
    {children}
  </button>;
}
