// SI-assisted: written with Claude Code (Anthropic); see README "Use of AI (SI)".
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/simulator", "/evidence", "/methods", "/about", "/credits"].map((p) => ({ url: `${SITE_URL}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.7 }));
}
