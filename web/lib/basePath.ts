// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Base path for raw URLs (fetch, <a href>) that Next's <Link>/router do not prefix. Empty except in the GitHub Pages build.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";
export const withBase = (p: string) => `${BASE_PATH}${p}`;
