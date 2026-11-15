// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { cn } from "@/lib/utils";

export const REPO_URL = "https://github.com/K4RM-P/flame-in-freefal";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]", className)}>
      <span aria-hidden className="relative grid h-2.5 w-2.5 place-items-center"><span className="absolute inset-0 rounded-full bg-ember" /><span className="absolute -inset-1 rounded-full bg-ember/20" /></span>
      EmberAtlas
    </span>
  );
}

