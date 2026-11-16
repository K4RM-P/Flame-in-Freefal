// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = { title: { absolute: "EmberAtlas — The firefighter for space" } };

export default function Home() {
  return <LandingPage />;
}
