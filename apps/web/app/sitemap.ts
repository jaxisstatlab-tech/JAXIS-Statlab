import type { MetadataRoute } from "next";

const BASE = "https://jaxis-statlab.com";

const PAGES: { path: string; priority: number }[] = [
  { path: "", priority: 1 },
  { path: "/about", priority: 0.8 },
  { path: "/pricing", priority: 0.9 },
  { path: "/contact", priority: 0.5 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(({ path, priority }) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority,
  }));
}
