// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
// NASA imagery used by the site. Target: self-hosted under web/public/nasa/ (no hot-linking, NASA logos cropped out).
// The sandbox network blocked the download (docs/HUMAN_TASKS.md lists the files): until a file is placed at `local`
// and `selfHosted` is set true, `src` falls back to the NASA URL. width/height = intrinsic size of the target file
// (null where not yet known; the component must not rely on it).
export interface MediaItem {
  src: string; alt: string; credit: string; sourceUrl: string; width: number | null; height: number | null;
  local: string; fallback: string; selfHosted: boolean;
}
const item = (m: Omit<MediaItem, "src">): MediaItem => ({ ...m, src: m.selfHosted ? m.local : m.fallback });

export const media = {
  /** Landing hero and OpenGraph image: spherical flame around an acrylic sample in the ISS Combustion Integrated Rack. */
  hero: item({
    alt: "A nearly spherical flame surrounding an acrylic sample in the International Space Station's Combustion Integrated Rack",
    credit: "NASA", sourceUrl: "https://science.nasa.gov/biological-physical/stories/how-and-why-do-nasa-researchers-simulate-microgravity-on-earth/",
    width: 1280, height: null, local: "/nasa/jsc2023e002281.jpg",
    fallback: "https://science.nasa.gov/wp-content/uploads/2024/01/jsc2023e002281orig.jpg?format=jpeg&w=1280", selfHosted: false,
  }),
  /** Saffire-IV fabric burn (Cygnus). */
  saffire: item({
    alt: "An orange flame spreads across fabric inside the Saffire-IV experiment.",
    credit: "NASA", sourceUrl: "https://www.nasa.gov/wp-content/uploads/2023/12/jsc2023e046375medium.jpg",
    width: 1280, height: 1037, local: "/nasa/jsc2023e046375.jpg",
    fallback: "https://www.nasa.gov/wp-content/uploads/2023/12/jsc2023e046375medium.jpg", selfHosted: false,
  }),
  /** Candle flame on Earth (left) vs in microgravity (right). */
  candle: item({
    alt: "A candle flame on Earth, tall and teardrop-shaped, beside a candle flame in microgravity, round and blue.",
    credit: "NASA Glenn Research Center (GRC-1998-C-00485)", sourceUrl: "https://images.nasa.gov/details/GRC-1998-C-00485",
    width: null, height: null, local: "/nasa/GRC-1998-C-00485.jpg",
    fallback: "https://images-assets.nasa.gov/image/GRC-1998-C-00485/GRC-1998-C-00485~medium.jpg", selfHosted: false,
  }),
  /** BASS-II flame on the ISS. */
  bass2: item({
    alt: "A flame burning on a material sample during the BASS-II experiment aboard the International Space Station.",
    credit: "NASA (iss040e072900)", sourceUrl: "https://images.nasa.gov/details/iss040e072900",
    width: null, height: null, local: "/nasa/iss040e072900.jpg",
    fallback: "https://images-assets.nasa.gov/image/iss040e072900/iss040e072900~large.jpg", selfHosted: false,
  }),
} as const;
