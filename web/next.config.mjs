// Static export is enabled only for the GitHub Pages build.
// GitHub Pages serves this project from /Flame-in-Freefall, not from the domain root.
const isStatic = process.env.STATIC_EXPORT === "1";
const basePath = isStatic ? (process.env.PAGES_BASE_PATH ?? "") : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isStatic
    ? {
        output: "export",
        basePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        async redirects() {
          const old = ["/kit", "/console", "/gaps", "/implications", "/earth", "/start", "/ask", "/models", "/models/:id", "/validation", "/evidence", "/review"];
          return old.map((source) => ({ source, destination: "/", permanent: false }));
        },
      }),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_STATIC_EXPORT: isStatic ? "1" : "0",
  },
};
export default nextConfig;
