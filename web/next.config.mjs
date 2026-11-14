// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// One screen (/) plus /methods; every older route redirects to the simulator.
const OLD = ["/kit", "/console", "/gaps", "/implications", "/earth", "/start", "/ask", "/models", "/models/:id", "/validation", "/evidence", "/review"];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: { "/api/*": ["./lib/ai/system.md"] },
  async redirects() {
    return OLD.map((source) => ({ source, destination: "/", permanent: false }));
  },
};
export default nextConfig;
