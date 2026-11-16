// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Shell } from "@/components/shell/Shell";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
