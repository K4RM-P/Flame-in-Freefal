// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Shell } from "@/components/shell/Shell";

export const metadata: Metadata = {
  title: { default: "EmberAtlas · Flame in Freefall challenge", template: "%s · EmberAtlas · Flame in Freefall" },
  description: "EmberAtlas, for the Flame in Freefall challenge, shows where and how a fire would start in your spacecraft, and which design change prevents it. Built on NASA's ISS fire data, explained by AI.",
};

// Dark-first: only an explicit saved "light" choice switches the theme.
const themeBootstrap = `(() => {
  let saved;
  try { saved = JSON.parse(localStorage.getItem("ea.theme")); } catch {}
  document.documentElement.dataset.theme = saved === "light" ? "light" : "dark";
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
