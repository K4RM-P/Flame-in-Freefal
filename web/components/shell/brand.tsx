// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import Image from "next/image";
import { cn } from "@/lib/utils";

export const REPO_URL = "https://github.com/K4RM-P/flame-in-freefal";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]", className)}>
      <Image src="/logo.png" alt="" width={24} height={24} className="h-6 w-6 shrink-0 select-none" draggable={false} priority />
      EmberAtlas
    </span>
  );
}

