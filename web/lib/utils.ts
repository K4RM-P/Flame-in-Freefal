// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
