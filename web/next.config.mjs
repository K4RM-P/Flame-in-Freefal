// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// STATIC_EXPORT=1 builds a static site for GitHub Pages (.github/workflows/pages.yml): no server, so /api/ask is
// removed before the build and Ask serves the cached golden answers in the browser. PAGES_BASE_PATH sets the subpath.
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = isStatic ? (process.env.PAGES_BASE_PATH ?? "") : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: { "/api/ask": ["./lib/ai/system.md"] },
  ...(isStatic && { output: "export", basePath, trailingSlash: true, images: { unoptimized: true } }),
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_STATIC_EXPORT: isStatic ? "1" : "0" },
};
export default nextConfig;
