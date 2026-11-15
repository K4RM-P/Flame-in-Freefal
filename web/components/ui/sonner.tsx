"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { Toaster as Sonner, toast } from "sonner";
export function Toaster() {
  return <Sonner position="bottom-left" theme="system" toastOptions={{ classNames: { toast: "!rounded-[10px] !border !border-border !bg-popover !text-popover-foreground !font-sans !text-[13px]", description: "!text-mute" } }} />;
}
export { toast };
