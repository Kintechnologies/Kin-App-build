import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Relatability } from "@/components/Relatability";
import { OutcomeCards } from "@/components/OutcomeCards";
import { HouseholdMemory } from "@/components/HouseholdMemory";
import { WhyDifferent } from "@/components/WhyDifferent";
import { BriefingDemo } from "@/components/BriefingDemo";
import { Capabilities } from "@/components/Capabilities";
import { Pricing } from "@/components/Pricing";
import { WaitlistSection } from "@/components/WaitlistSection";
import { Footer } from "@/components/Footer";

// V6 P1-L1: explicit OG image + Twitter card image so social previews on
// Slack / Twitter / LinkedIn / iMessage all render the branded card instead
// of a blank box. The opengraph-image file convention also generates an OG
// asset, but explicit declarations here guarantee the meta tags exist
// regardless of which Next.js metadata-merging path the build takes.
const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Kin — Stop keeping your family schedule in your head.",
};

export const metadata: Metadata = {
  title: "Kin — Stop keeping your family schedule in your head",
  description:
    "Kin watches your family's schedule and tells you what matters — before you have to figure it out yourself.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://kinai.family"
  ),
  openGraph: {
    title: "Kin — Stop keeping your family schedule in your head",
    description:
      "Kin watches your family's schedule and tells you what matters — before you have to figure it out yourself.",
    url: "https://kinai.family",
    siteName: "Kin",
    locale: "en_US",
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kin — Stop keeping your family schedule in your head",
    description:
      "Kin watches your family's schedule and tells you what matters — before you have to figure it out yourself.",
    images: [OG_IMAGE.url],
  },
  // Pin the canonical so syndication/preview routes don't accidentally fan
  // out into separate indexed copies (audit V7 P2-L2).
  alternates: { canonical: "/" },
};

// P1-L1 (audit v7): Product + FAQPage JSON-LD so Perplexity, ChatGPT
// search, and Google AI Overviews can resolve "what does Kin do?"
// queries to first-party answers rather than a blank knowledge card.
const PRODUCT_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Kin",
  description:
    "Kin is a family AI chief of staff that sends a daily 6am SMS briefing covering the day's schedule, pickup risk, and household coordination. Syncs Google + Apple calendars across both parents.",
  brand: { "@type": "Brand", name: "Kin" },
  offers: {
    "@type": "Offer",
    price: "39",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: "https://kinai.family",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: "39",
      priceCurrency: "USD",
      unitText: "MONTH",
    },
  },
};

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does Kin do?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Kin texts you a personalized 6am briefing every morning covering the day's schedule, pickup conflicts, and anything that requires coordination across both parents. You can also text Kin back any time with questions like 'who has pickup today?' and it answers in plain language.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need a mobile app?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "No. Kin works over SMS and a web dashboard — no app to install. You sign up at kinai.family, connect your calendar, and the morning briefing arrives via text.",
      },
    },
    {
      "@type": "Question",
      name: "How much does Kin cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "$39/month for the whole household. One subscription covers both parents and unlimited kids on a single shared household.",
      },
    },
    {
      "@type": "Question",
      name: "Which calendars does Kin work with?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Google Calendar and Apple Calendar (iCloud) via app-specific password. Both parents can each connect their own accounts.",
      },
    },
  ],
};

export default function Home() {
  return (
    <main className="marketing" style={{ backgroundColor: "#F7F3ED", color: "#2B261E" }}>
      {/* P1-L1 (audit v7): Product + FAQPage JSON-LD. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(PRODUCT_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <Nav />
      <Hero />
      <Relatability />
      <OutcomeCards />
      <HouseholdMemory />
      <WhyDifferent />
      <BriefingDemo />
      <Capabilities />
      <Pricing />
      <WaitlistSection />
      <Footer />
    </main>
  );
}
