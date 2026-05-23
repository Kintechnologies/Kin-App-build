import type { MetadataRoute } from "next";

const BASE_URL = "https://kinai.family";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  // P1-L3 (audit v7): /signin and /signup are no longer here. Indexers had
  // no reason to crawl them, the pages bounce to login, and the demo-mode
  // path is a server-rendered surface we don't want SERPs caching.
  return [
    { url: `${BASE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
