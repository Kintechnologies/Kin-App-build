import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // P1-L3 (audit v7): /auth, /signin, /signup don't need crawl budget — they
  // either bounce to login or expose the demo-creds prefill (which itself
  // shouldn't end up in a SERP). The sitemap was also dropping them in.
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/privacy", "/terms"],
        disallow: [
          "/dashboard",
          "/onboarding",
          "/connect",
          "/join",
          "/api",
          "/auth",
          "/signin",
          "/signup",
        ],
      },
    ],
    host: "https://kinai.family",
    sitemap: "https://kinai.family/sitemap.xml",
  };
}
