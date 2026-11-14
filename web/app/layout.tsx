import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { MissionBar } from "@/components/MissionBar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "EmberAtlas — validated microgravity fire-safety models",
  description: "Physics models calibrated and validated on NASA PSI microgravity combustion data, with a tool-grounded AI analyst.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Nav />
        <MissionBar />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-7xl px-4 pb-8 pt-4 text-xs text-mute">
          EmberAtlas · NASA Space Apps 2026 · Flame in Freefall · MIT · Built on NASA PSI data. AI-generated answers come from cited tools and sources; verify before engineering use.
        </footer>
      </body>
    </html>
  );
}
