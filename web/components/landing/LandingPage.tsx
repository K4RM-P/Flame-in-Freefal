// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Scroll-driven landing (same arc as the pitch deck). All numbers come from lib/landing/facts (data + engine).
import { existsSync } from "node:fs";
import { join } from "node:path";
import dynamic from "next/dynamic";
import summary from "@/data/validation/summary.json";
import { landingFacts } from "@/lib/landing/facts";
import { Hero } from "./Hero";
import { Story } from "./Story";
import { FinalCta, Findings, LandingFooter, LiveDemo, Marquee, Trust } from "./Sections";

const Bento = dynamic(() => import("./Bento").then((m) => m.Bento));
const HowItWorks = dynamic(() => import("./HowItWorks").then((m) => m.HowItWorks));

export function LandingPage() {
  const f = landingFacts();
  const targets = (summary as { targets: { status: string }[] }).targets;
  const video = existsSync(join(process.cwd(), "public/media/demo.mp4"));
  return (
    <div className="bg-bg">
      <Hero status={{ experiments: f.psi.accessions, rows: f.psi.rows, mismatches: f.flex.mismatches, compared: f.flex.compared }} />
      <Story f={f.stops} />
      <Bento f={{ front: f.run?.front ?? null, aName: f.run?.aName ?? "A", bName: f.run?.bName ?? "B", evidence: f.run?.evidence ?? [], fixes: f.run?.fixes ?? [], next: f.run?.next ?? null, spreadN: f.spread.n }} />
      <HowItWorks />
      <LiveDemo run={f.run} video={video} />
      <Findings f={f} />
      <Marquee chips={f.psi.chips} />
      <Trust f={f} pass={targets.filter((t) => t.status === "pass").length} fail={targets.filter((t) => t.status === "fail").length} pending={targets.filter((t) => t.status !== "pass" && t.status !== "fail").length} />
      <FinalCta />
      <LandingFooter />
    </div>
  );
}
