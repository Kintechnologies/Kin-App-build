import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Relatability } from "@/components/Relatability";
import { OutcomeCards } from "@/components/OutcomeCards";
import { WhyDifferent } from "@/components/WhyDifferent";
import { BriefingDemo } from "@/components/BriefingDemo";
import { Pricing } from "@/components/Pricing";
import { WaitlistSection } from "@/components/WaitlistSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main style={{ backgroundColor: "#ECE4D2", color: "#2B261E" }}>
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
