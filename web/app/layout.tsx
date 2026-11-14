// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Shell } from "@/components/shell/Shell";

import { Aster } from "@/components/Aster";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "EmberAtlas — will it burn on the Moon?",
  description: "Validated fire physics built on NASA's ISS combustion experiments, for the cabins Artemis crews will live in.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${inter.variable} ${mono.variable} ${serif.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Shell>{children}</Shell>
        <Aster />
      </body>
    </html>
  );
}
