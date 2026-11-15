"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { useCallback } from "react";
import { CountUp } from "./motion";
import { sig } from "@/lib/ui/format";

/** Count-up stat; `value` always comes from lib/landing/facts (data files or the engine). */
export function Stat({ value, digits, suffix = "" }: { value: number; digits?: number; suffix?: string }) {
  const fmt = useCallback((v: number) => `${digits ? sig(v, digits) : Math.round(v)}${suffix}`, [digits, suffix]);
  return <CountUp value={value} format={fmt} />;
}
