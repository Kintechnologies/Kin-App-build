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
};

export default function Home() {
  return (
    <main className="marketing" style={{ backgroundColor: "#F7F3ED", color: "#2B261E" }}>
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
