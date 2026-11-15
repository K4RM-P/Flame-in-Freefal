"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Vercel-style top bar: ember-dot logo · Simulator · Evidence · Methods · About · theme toggle · GitHub.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { FolderGit2, Moon, Sun } from "lucide-react";
import { Aster } from "@/components/Aster";
import { TooltipProvider, Tip } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMission, lsSet } from "@/lib/store";
import { Logo, REPO_URL } from "./brand";

const NAV = [["/simulator", "Simulator"], ["/evidence", "Evidence"], ["/methods", "Methods"], ["/about", "About"]] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const set = useMission((s) => s.set);
  const path = usePathname().replace(/(.)\/$/, "$1");
  const reduce = useReducedMotion();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const t = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(t); set({ theme: t });
  }, [set]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next); set({ theme: next }); lsSet("ea.theme", next);
  }
  const landing = path === "/";
  return (
    <TooltipProvider delayDuration={250}>
      <header className={cn("sticky top-0 z-40 flex h-14 items-center gap-6 border-b px-4 transition-[background-color,border-color] duration-200 md:px-6",
        scrolled || !landing ? "border-line bg-bg/80 backdrop-blur-md" : "border-transparent bg-transparent")} data-testid="topbar">
        <Link href="/" aria-label="EmberAtlas" className="shrink-0 rounded-md"><Logo /></Link>
        <nav aria-label="Main" className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {NAV.map(([href, label]) => {
            const active = path === href;
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined}
                className={cn("relative rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-150", active ? "text-ink" : "text-mute hover:text-ink")}>
                {label}
                {active && <motion.span layoutId="nav-underline" className="absolute inset-x-2.5 -bottom-[11px] h-px bg-ember" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }} />}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Tip label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
            <Button variant="ghost" size="icon-sm" aria-label="Theme" aria-pressed={theme === "light"} data-theme-value={theme} onClick={toggleTheme}>
              {theme === "dark" ? <Moon strokeWidth={1.5} /> : <Sun strokeWidth={1.5} />}
            </Button>
          </Tip>
          <Tip label="Source on GitHub">
            <Button asChild variant="ghost" size="icon-sm"><a href={REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub repository"><FolderGit2 strokeWidth={1.5} /></a></Button>
          </Tip>
        </div>
      </header>
      <main key={path} className={`page-fade mx-auto min-w-0 ${path === "/" ? "max-w-none p-0" : "max-w-[1600px] px-4 py-4 md:px-6"}`}>{children}</main>
      <footer className="mx-auto max-w-[1600px] border-t border-line px-4 py-3 text-[12px] text-faint md:px-6" data-noprint>
        Built on NASA PSI Data Repository: Combustion Science. Partial gravity is an estimate (µg ↔ 1 g) that may be non-conservative (NASA FM2). Not for flight certification.
        {" · "}<Link className="underline underline-offset-2" href="/about">About EmberAtlas</Link>
      </footer>
      <main key={path} className={`page-fade mx-auto min-w-0 ${landing ? "-mt-14 max-w-none p-0" : "max-w-[1600px] px-4 py-6 md:px-6"}`}>{children}</main>
      {!landing && <footer className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-4 py-3 font-mono text-[11px] uppercase tracking-[0.06em] text-faint md:px-6" data-noprint>
        <span>NASA PSI Data Repository · Combustion Science</span><span aria-hidden>·</span>
        <span>Partial gravity = bounded estimate (µg ↔ 1 g)</span><span aria-hidden>·</span><span>Not for flight certification</span>
        <Link className="ml-auto hover:text-ink" href="/about">About EmberAtlas</Link>
      </footer>}
      <Aster />
      <Toaster />
    </TooltipProvider>
  );
}
