// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// Landing page at /; the simulation workspace lives at /simulator.
const OLD = ["/kit", "/console", "/gaps", "/implications", "/earth", "/start", "/ask", "/models", "/models/:id", "/validation", "/review"];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: { "/api/*": ["./lib/ai/system.md"] },
  async redirects() {
    return [
      ...OLD.map((source) => ({ source, destination: "/simulator", permanent: false })),
      { source: "/dashboard", destination: "/simulator", permanent: false },
      { source: "/match", destination: "/evidence", permanent: false },
    ];
  },
};
export default nextConfig;
