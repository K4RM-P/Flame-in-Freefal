// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: { "/api/ask": ["./lib/ai/system.md"] },
};
export default nextConfig;
