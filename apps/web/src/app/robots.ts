import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms"],
        disallow: ["/dashboard", "/onboarding", "/connect", "/join", "/api"],
      },
    ],
    host: "https://kinai.family",
    sitemap: "https://kinai.family/sitemap.xml",
  };
}
