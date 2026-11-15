// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Newsreader } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Shell } from "@/components/shell/Shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: "EmberAtlas", template: "%s · EmberAtlas" },
  description: "NASA PSI evidence and transparent spacecraft fire-safety simulation.",
};

const themeBootstrap = "try{document.documentElement.dataset.theme=JSON.parse(localStorage.getItem('ea.theme'))==='light'?'light':'dark'}catch{}";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${inter.variable} ${mono.variable} ${serif.variable}`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body className="min-h-screen font-sans antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
