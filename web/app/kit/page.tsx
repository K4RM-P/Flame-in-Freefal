"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { useState } from "react";
import { Callout, CopyButton, EmptyState, NumberTween, ParamSlider, Segmented, Skeleton, StatusChip, Term } from "@/components/ui-kit";
import { ResultCard } from "@/components/console/ResultCard";
import { runSmoke } from "@/lib/physics/models";
import { OKABE_ITO } from "@/lib/ui/palette";

export default function Kit() {
  const [v, setV] = useState(10);
  const [seg, setSeg] = useState("a");
  return (
    <div className="space-y-8">
      <h1 className="display text-[32px]">ui-kit</h1>
      <p className="text-mute">Hidden reference page for the EmberAtlas component kit (web/components/ui-kit, tokens in web/styles/tokens.css).</p>
      <section className="space-y-2"><p className="label">Status</p><div className="flex gap-2"><StatusChip status="validated" /><StatusChip status="extrapolation" /><StatusChip status="theory" /><StatusChip status="nodata" /></div></section>
      <section className="space-y-2"><p className="label">Number tween</p><NumberTween value={v * 1.37} s={3} className="text-[32px]" /><ParamSlider label="value" value={v} min={1} max={50} step={1} onChange={setV} hist={[1, 3, 5, 9, 4, 2, 1, 0, 2, 6]} /></section>
      <section className="space-y-2"><p className="label">Segmented</p><Segmented options={[{ v: "a", label: "µg" }, { v: "b", label: "Moon" }, { v: "c", label: "Mars" }]} value={seg} onChange={setSeg} /></section>
      <section className="space-y-2"><p className="label">Callout · Term · Copy</p><Callout>One-line guidance in a callout.</Callout><p>A <Term k="LOI" /> and <Term k="thermally thin" />.</p><CopyButton text="copied" /></section>
      <section className="grid gap-3 md:grid-cols-3"><ResultCard title="Result card" r={runSmoke(120)} meaning="Big number, range, status, meaning, receipt." /><EmptyState title="No data">Explains why, offers an action.</EmptyState><Skeleton h={120} /></section>
      <section className="flex gap-2">{OKABE_ITO.map((c) => <span key={c} className="num h-10 w-20 text-[11px]" style={{ background: c }}>{c}</span>)}</section>
    </div>
  );
}
