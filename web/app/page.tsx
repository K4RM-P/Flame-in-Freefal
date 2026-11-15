// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { media } from "@/lib/media";

export const metadata: Metadata = {
  title: { absolute: "EmberAtlas · The firefighter for space · Flame in Freefall challenge" },
  description: "EmberAtlas shows where and how a fire would start in your spacecraft, and which design change prevents it. Built on NASA's ISS fire data, explained by AI.",
  openGraph: { title: "EmberAtlas · The firefighter for space", description: "Where a fire would start in your spacecraft, and which design change prevents it. Built on NASA's ISS fire data, explained by AI.", type: "website", images: [{ url: media.hero.src, alt: media.hero.alt }] },
  twitter: { card: "summary_large_image" },
};

export default function Home() {
  return <LandingPage />;
}
