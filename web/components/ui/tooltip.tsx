"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<React.ElementRef<typeof TooltipPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>>(
  ({ className, sideOffset = 6, ...props }, ref) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content ref={ref} sideOffset={sideOffset}
        className={cn("z-[70] overflow-hidden rounded-md border border-border bg-popover px-2 py-1 font-mono text-[11px] text-popover-foreground shadow-md data-[state=delayed-open]:animate-in", className)} {...props} />
    </TooltipPrimitive.Portal>
  ),
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/** Convenience: wrap one trigger with a tooltip label and optional keyboard hint. */
function Tip({ label, kbd, children, side }: { label: string; kbd?: string; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}{kbd && <kbd className="ml-2 rounded border border-border px-1 text-faint">{kbd}</kbd>}</TooltipContent>
    </Tooltip>
  );
}
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, Tip };
