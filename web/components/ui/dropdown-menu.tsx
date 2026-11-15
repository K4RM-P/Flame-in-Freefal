"use client";
// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const item = "relative flex cursor-default select-none items-center gap-2 rounded-[4px] px-2 py-1.5 text-[13px] outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-mute";

const DropdownMenuContent = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>>(
  ({ className, sideOffset = 6, ...props }, ref) => (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content ref={ref} sideOffset={sideOffset}
        className={cn("ea-pop z-[65] min-w-[13rem] overflow-hidden rounded-[10px] border border-border bg-popover p-1 text-popover-foreground shadow-xl", className)} {...props} />
    </DropdownMenuPrimitive.Portal>
  ),
);
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;
const DropdownMenuItem = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.Item>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>>(
  ({ className, ...props }, ref) => <DropdownMenuPrimitive.Item ref={ref} className={cn(item, className)} {...props} />,
);
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;
const DropdownMenuCheckboxItem = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>>(
  ({ className, children, ...props }, ref) => (
    <DropdownMenuPrimitive.CheckboxItem ref={ref} className={cn(item, "pl-7", className)} {...props}>
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center"><DropdownMenuPrimitive.ItemIndicator><Check strokeWidth={1.5} /></DropdownMenuPrimitive.ItemIndicator></span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  ),
);
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;
const DropdownMenuRadioItem = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>>(
  ({ className, children, ...props }, ref) => (
    <DropdownMenuPrimitive.RadioItem ref={ref} className={cn(item, "pl-7", className)} {...props}>
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center"><DropdownMenuPrimitive.ItemIndicator><span className="h-1.5 w-1.5 rounded-full bg-ember" /></DropdownMenuPrimitive.ItemIndicator></span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  ),
);
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;
const DropdownMenuLabel = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.Label>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>>(
  ({ className, ...props }, ref) => <DropdownMenuPrimitive.Label ref={ref} className={cn("px-2 pb-1 pt-2 font-mono text-[11px] uppercase tracking-label text-faint", className)} {...props} />,
);
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;
const DropdownMenuSeparator = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.Separator>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>>(
  ({ className, ...props }, ref) => <DropdownMenuPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />,
);
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;
const DropdownMenuSubTrigger = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger>>(
  ({ className, children, ...props }, ref) => (
    <DropdownMenuPrimitive.SubTrigger ref={ref} className={cn(item, "data-[state=open]:bg-accent", className)} {...props}>{children}<ChevronRight className="ml-auto" strokeWidth={1.5} /></DropdownMenuPrimitive.SubTrigger>
  ),
);
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;
const DropdownMenuSubContent = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.SubContent>, React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent ref={ref} className={cn("ea-pop z-[66] min-w-[12rem] overflow-hidden rounded-[10px] border border-border bg-popover p-1 text-popover-foreground shadow-xl", className)} {...props} />
    </DropdownMenuPrimitive.Portal>
  ),
);
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuRadioGroup };
