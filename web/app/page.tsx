// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { media } from "@/lib/media";

export const metadata: Metadata = {
  title: "Spacecraft fire, tested against NASA evidence",
  description: "Explore NASA's in-space combustion evidence, replay Saffire telemetry, and test spacecraft fire scenarios with explicit sources, uncertainty, and model limits.",
  openGraph: {
    title: "EmberAtlas | Spacecraft fire, tested against NASA evidence",
    description: "Trace NASA PSI combustion data into a spacecraft fire-safety simulation.",
    type: "website",
    images: [{ url: media.hero.src, alt: media.hero.alt }],
  },
  twitter: { card: "summary_large_image" },
};

export default function Home() {
  return <LandingPage />;
}
