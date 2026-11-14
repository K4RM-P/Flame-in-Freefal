/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: { "/api/ask": ["./lib/ai/system.md"] },
  async redirects() {
    return [
      { source: "/console", destination: "/review", permanent: false },
      { source: "/gaps", destination: "/evidence#gaps", permanent: false },
      { source: "/earth", destination: "/evidence#earth-vs-orbit", permanent: false },
      { source: "/implications", destination: "/review", permanent: false },
      { source: "/ask", destination: "/review", permanent: false },
      { source: "/kit", destination: "/methods", permanent: false },
      { source: "/models", destination: "/methods#models", permanent: false },
      { source: "/models/:id", destination: "/methods#models", permanent: false },
      { source: "/validation", destination: "/methods#validation", permanent: false },
    ];
  },
};
export default nextConfig;
