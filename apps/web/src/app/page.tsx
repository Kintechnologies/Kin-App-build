import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Relatability } from "@/components/Relatability";
import { OutcomeCards } from "@/components/OutcomeCards";
import { WhyDifferent } from "@/components/WhyDifferent";
import { BriefingDemo } from "@/components/BriefingDemo";
import { Pricing } from "@/components/Pricing";
import { WaitlistSection } from "@/components/WaitlistSection";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Kin — Stop keeping your family schedule in your head",
  description:
    "Kin watches your family's schedule and tells you what matters — before you have to figure it out yourself.",
  openGraph: {
    title: "Kin — Stop keeping your family schedule in your head",
    description:
      "Kin watches your family's schedule and tells you what matters — before you have to figure it out yourself.",
    url: "https://kinai.family",
    siteName: "Kin",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kin — Stop keeping your family schedule in your head",
    description:
      "Kin watches your family's schedule and tells you what matters — before you have to figure it out yourself.",
  },
};

export default function Home() {
  return (
    <main className="marketing" style={{ backgroundColor: "#ECE4D2", color: "#2B261E" }}>
      <Nav />
      <Hero />
      <Relatability />
      <OutcomeCards />
      <WhyDifferent />
      <BriefingDemo />
      <Pricing />
      <WaitlistSection />
      <Footer />
    </main>
  );
}
