// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import Image from "next/image";
import { cn } from "@/lib/utils";

export const REPO_URL = "https://github.com/K4RM-P/flame-in-freefal";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em]", className)}>
      <Image src="/icon.svg" alt="" width={28} height={28} className="shrink-0" />
      EmberAtlas
    </span>
  );
}

