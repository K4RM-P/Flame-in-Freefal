"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Vercel-style top bar: flame logo · Simulator · Evidence · Methods · About · theme toggle · GitHub.
import { CHALLENGE_NAME, CHALLENGE_URL, TEAM_CITY, TEAM_NAME } from "@/lib/team";
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
import { useMission, lsGet, lsSet } from "@/lib/store";
import { Logo, REPO_URL } from "./brand";
import { PageTranslation } from "./PageTranslation";
import { LANGUAGES, LanguageContext, navigationLabels, type Language } from "./Language";

const NAV = ["/simulator", "/evidence", "/methods", "/about"] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const set = useMission((s) => s.set);
  const path = usePathname().replace(/(.)\/$/, "$1");
  const reduce = useReducedMotion();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [scrolled, setScrolled] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  useEffect(() => {
    const t = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(t); set({ theme: t });
    const saved = lsGet<unknown>("ea.language", "en");
    if (typeof saved === "string" && Object.prototype.hasOwnProperty.call(LANGUAGES, saved)) setLanguage(saved as Language);
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
    <LanguageContext.Provider value={language}>
    <TooltipProvider delayDuration={250}>
      <header className={cn("sticky top-0 z-40 flex h-14 items-center gap-x-6 border-b px-4 max-sm:h-auto max-sm:flex-wrap max-sm:gap-y-1 max-sm:pt-2 transition-[background-color,border-color] duration-200 md:px-6",
        scrolled || !landing ? "border-line bg-bg/80 backdrop-blur-md" : "border-transparent bg-transparent")} data-testid="topbar">
        <Link href="/" aria-label="EmberAtlas" className="shrink-0 rounded-md"><Logo /></Link>
        <nav aria-label="Main" className="flex min-w-0 items-center gap-1 overflow-x-auto max-sm:order-last max-sm:-ml-2.5 max-sm:w-full max-sm:pb-1">
          {NAV.map((href, index) => {
            const label = navigationLabels(language)[index];
            const active = path === href;
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined}
                className={cn("relative shrink-0 rounded-md px-1.5 py-1.5 text-[13px] sm:px-2.5 transition-colors duration-150", active ? "text-ink" : "text-mute hover:text-ink")}>
                {label}
                {active && <motion.span layoutId="nav-underline" className="absolute inset-x-2.5 -bottom-[11px] h-px bg-ember" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }} />}
              </Link>
            );
          })}
        </nav>
        <div data-no-translate className="ml-auto flex items-center gap-1">
          <label htmlFor="site-language" className="sr-only">Site language</label>
          <select id="site-language" className="hidden h-8 w-auto sm:block max-w-[7.5rem] text-[12px] text-mute" value={language} title="Site language"
            onChange={(e) => { const c = e.target.value as Language; lsSet("ea.language", c); setLanguage(c); }}>
            {Object.entries(LANGUAGES).map(([code, name]) => <option key={code} value={code} lang={code}>{name}</option>)}
          </select>
          <Tip label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
            <Button variant="ghost" size="icon-sm" aria-label="Theme" aria-pressed={theme === "light"} data-theme-value={theme} onClick={toggleTheme}>
              {theme === "dark" ? <Moon strokeWidth={1.5} /> : <Sun strokeWidth={1.5} />}
            </Button>
          </Tip>
          <Tip label="Source on GitHub">
            <Button asChild variant="ghost" size="icon-sm" className="hidden sm:inline-flex"><a href={REPO_URL} target="_blank" rel="noreferrer" aria-label="GitHub repository"><FolderGit2 strokeWidth={1.5} /></a></Button>
          </Tip>
        </div>
      </header>
      <PageTranslation />
      <main key={path} className={`page-fade mx-auto min-w-0 ${landing ? "-mt-14 max-w-none p-0" : "max-w-[1600px] px-4 py-6 md:px-6"}`}>{children}</main>
      {!landing && <footer className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-4 pb-20 pt-3 font-mono sm:pb-3 text-[11px] uppercase tracking-[0.06em] text-faint md:px-6" data-noprint>
        <span>NASA PSI Data Repository · Combustion Science</span><span aria-hidden>·</span>
        <span>Partial gravity = estimate (µg ↔ 1 g), may be non-conservative (NASA FM2)</span><span aria-hidden>·</span><span>Not for flight certification</span>
        <span className="ml-auto">{TEAM_NAME} · {TEAM_CITY} · <a className="hover:text-ink underline-offset-2 hover:underline" href={CHALLENGE_URL} target="_blank" rel="noreferrer">NASA Space Apps 2026 · {CHALLENGE_NAME}</a></span>
        <Link className="hover:text-ink" href="/credits">Credits</Link>
        <Link className="hover:text-ink" href="/about">About</Link>
      </footer>}
      <Aster />
      <Toaster />
    </TooltipProvider>
    </LanguageContext.Provider>
  );
}
