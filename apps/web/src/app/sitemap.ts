import type { MetadataRoute } from "next";

const BASE_URL = "https://kinai.family";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${BASE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/signin`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/signup`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
