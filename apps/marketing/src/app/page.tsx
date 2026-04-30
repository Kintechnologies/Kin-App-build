import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Relatability } from "@/components/Relatability";
import { OutcomeCards } from "@/components/OutcomeCards";
import { WhyDifferent } from "@/components/WhyDifferent";
import { Pricing } from "@/components/Pricing";
import { SocialProof } from "@/components/SocialProof";
import { WaitlistSection } from "@/components/WaitlistSection";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main style={{ backgroundColor: "#0C0F0A", color: "#F0EDE6" }}>
      <Nav />
      <Hero />
      <Relatability />
      <OutcomeCards />
      <WhyDifferent />
      <Pricing />
      <SocialProof />
      <WaitlistSection />
      <Footer />
    </main>
  );
}
