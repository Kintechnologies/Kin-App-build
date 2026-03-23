import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="font-serif italic text-2xl text-primary mb-8 inline-block">
          Kin
        </Link>

        <h1 className="font-serif italic text-3xl text-warm-white mb-2">Terms of Service</h1>
        <p className="text-warm-white/40 text-sm mb-2">Kin Technologies LLC</p>
        <p className="text-warm-white/40 text-sm mb-8">Last updated: March 2026</p>

        <p className="text-warm-white/60 text-sm italic mb-8 bg-surface-raised rounded-2xl p-4 border border-warm-white/5">
          These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you and Kin Technologies LLC governing your use of Kin: Family AI and the kinai.family website. By creating an account or using Kin, you agree to these Terms. If you do not agree, do not use the service.
        </p>

        <div className="space-y-8 text-warm-white/70 text-sm leading-relaxed">
          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">1. The Service</h2>
            <p className="mb-3">
              Kin Technologies LLC operates Kin: Family AI, an AI-powered family household management application providing meal planning, budget tracking, calendar coordination, grocery list generation, and related family assistance features.
            </p>
            <p>
              Kin is a software service, not a financial advisor, nutritionist, healthcare provider, or professional services firm. Nothing in the Service constitutes professional financial, legal, medical, nutritional, or veterinary advice.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">2. Eligibility</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60">
              <li>You must be at least 18 years old</li>
              <li>Be a resident of the United States or Canada</li>
              <li>Have the legal capacity to enter into a binding agreement</li>
              <li>Not be prohibited from using the Service under applicable law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">3. Accounts</h2>
            <p className="mb-3">
              You must create an account to use Kin. You agree to provide accurate, current, and complete information and to keep your account information updated. You are responsible for maintaining the confidentiality of your account password.
            </p>
            <p>
              On the Family plan, you may invite a partner to join your household. By inviting a partner, you represent that you have their consent to share household-level information as described in our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">4. Subscriptions & Billing</h2>
            <div className="bg-surface-raised rounded-2xl p-4 mb-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-primary font-semibold">Starter</span>
                <span className="text-warm-white/60 font-mono">$29/month</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-amber font-semibold">Family</span>
                <span className="text-warm-white/60 font-mono">$49/month</span>
              </div>
            </div>
            <ul className="list-disc pl-5 space-y-2 text-warm-white/60">
              <li>All plans include a <strong className="text-warm-white/70">7-day free trial</strong>. No credit card required to start.</li>
              <li>Subscriptions renew automatically. Cancel anytime from Settings.</li>
              <li>Cancellation takes effect at the end of your current billing period.</li>
              <li><strong className="text-warm-white/70">Refunds:</strong> Full refund within 7 days of your first paid charge. Contact hello@kinai.family.</li>
              <li>We may change prices with at least 30 days&apos; advance notice by email.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">5. Referral Program</h2>
            <p className="mb-3">
              After your second paid month, you unlock a personal referral code. When someone you refer subscribes and completes their first paid month, you receive one free month of service. Maximum 3 free months lifetime. After 3 free months: $15 account credit per successful referral.
            </p>
            <p>
              The referred family gets their first month completely free. Referral rewards are applied as credits to your next billing cycle and cannot be exchanged for cash.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">6. AI-Generated Content</h2>
            <div className="bg-rose/10 border border-rose/20 rounded-2xl p-4 mb-3">
              <p className="text-warm-white/70 text-xs">
                <strong className="text-rose">Important:</strong> Kin&apos;s recommendations are generated by AI and are not reviewed by human professionals. They are provided for convenience and general guidance only — not as professional financial, nutritional, medical, legal, or veterinary advice. Always consult qualified professionals.
              </p>
            </div>
            <p>
              Kin&apos;s AI may occasionally generate inaccurate, incomplete, or outdated information. Grocery price estimates are approximate. Always verify important information before acting on it.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">7. Acceptable Use</h2>
            <p className="mb-3">You may use Kin for personal, family, non-commercial household management purposes. You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60">
              <li>Use Kin for any commercial purpose without written permission</li>
              <li>Attempt to access another user&apos;s private account data</li>
              <li>Reverse engineer or extract the source code</li>
              <li>Use automated tools to scrape or extract data</li>
              <li>Attempt to overload or disrupt the service</li>
              <li>Use Kin to store or transmit illegal content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">8. Privacy</h2>
            <p>
              Your use of Kin is also governed by our{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>,
              which is incorporated into these Terms by reference. It describes how we collect, use, and protect your information, including the dual-parent profile privacy architecture.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">9. Disclaimers</h2>
            <p className="uppercase text-warm-white/50 text-xs leading-relaxed">
              The Kin service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. To the fullest extent permitted by law, Kin Technologies LLC disclaims all warranties, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">10. Limitation of Liability</h2>
            <p className="uppercase text-warm-white/50 text-xs leading-relaxed">
              To the fullest extent permitted by applicable law, Kin Technologies LLC will not be liable for any indirect, incidental, special, consequential, or punitive damages. Our total liability will not exceed the amount you paid to us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">11. Dispute Resolution</h2>
            <p className="mb-3">
              Before filing any legal claim, contact us at hello@kinai.family and attempt to resolve the dispute informally within 30 days.
            </p>
            <p className="mb-3">
              These Terms are governed by the laws of the State of Ohio. Any legal action must be brought in Ohio state or federal courts. You agree to resolve disputes individually, not as part of any class action.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">12. Termination</h2>
            <p className="mb-3">
              You may stop using Kin and close your account at any time. We may suspend or terminate your account for violations of these Terms. Upon termination, your data enters a 90-day grace period, then is permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">13. Changes to These Terms</h2>
            <p>
              We will notify you by email and through the app at least 14 days before material changes take effect.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">14. Contact</h2>
            <p className="mb-1">Kin Technologies LLC</p>
            <p>Email: <span className="text-primary">hello@kinai.family</span></p>
            <p>Website: kinai.family</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-warm-white/10 flex gap-4">
          <Link href="/privacy" className="text-warm-white/30 text-sm hover:text-warm-white/50 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/pricing" className="text-warm-white/30 text-sm hover:text-warm-white/50 transition-colors">
            Pricing
          </Link>
        </div>
      </div>
    </main>
  );
}
