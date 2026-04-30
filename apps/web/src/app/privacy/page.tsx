import Link from "next/link";
import KinWordmark from "@/components/KinWordmark";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <Link href="/" style={{ textDecoration: "none", marginBottom: 32, display: "inline-block" }}>
          <KinWordmark size={20} tone="warm" />
        </Link>

        <h1 className="text-3xl font-medium text-warm-white mb-2" style={{ letterSpacing: "-0.025em" }}>Privacy Policy</h1>
        <p className="text-warm-white/40 text-sm mb-2">Kin Technologies LLC</p>
        <p className="text-warm-white/40 text-sm mb-8">Last updated: March 2026</p>

        <p className="text-warm-white/60 text-sm italic mb-8 bg-surface-raised rounded-2xl p-4 border border-warm-white/5">
          This Privacy Policy explains how Kin Technologies LLC (&quot;Kin,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) collects, uses, stores, and protects information when you use Kin: Family AI and the kinai.family website. Kin is available to residents of the United States and Canada. Please read this policy carefully. By using Kin, you agree to the practices described here.
        </p>

        <div className="space-y-8 text-warm-white/70 text-sm leading-relaxed">
          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">1. Who We Are</h2>
            <p>
              Kin Technologies LLC is the operator of Kin: Family AI, a family AI assistant application. We are incorporated in Ohio and operate the Kin service at kinai.family. If you have any questions about this Privacy Policy, contact us at hello@kinai.family.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">2. What Information We Collect</h2>

            <h3 className="text-primary text-sm font-semibold mb-2">2.1 Information You Provide Directly</h3>
            <p className="mb-3">When you create a Kin account and set up your family profile, we collect:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60 mb-4">
              <li><strong className="text-warm-white/70">Account information:</strong> email address, password (stored as a secure hash)</li>
              <li><strong className="text-warm-white/70">Family profile:</strong> family name, household type, number of adults and children, children&apos;s ages</li>
              <li><strong className="text-warm-white/70">Parent profiles:</strong> first name, age, wellness goals (private to each parent)</li>
              <li><strong className="text-warm-white/70">Kids&apos; profiles:</strong> first names, ages, dietary preferences, allergies, schedule information</li>
              <li><strong className="text-warm-white/70">Pet profiles:</strong> pet names, species, breed, veterinary information, medication schedules</li>
              <li><strong className="text-warm-white/70">Food and meal preferences:</strong> dietary restrictions, allergies, and food preferences</li>
              <li><strong className="text-warm-white/70">Budget information:</strong> household grocery budget and spending information you manually enter</li>
              <li><strong className="text-warm-white/70">Conversation content:</strong> messages you send to Kin and the responses Kin provides</li>
              <li><strong className="text-warm-white/70">Meal ratings:</strong> feedback you provide on meals Kin suggests</li>
            </ul>

            <h3 className="text-primary text-sm font-semibold mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60 mb-4">
              <li>Device information: device type, operating system version, and app version</li>
              <li>Usage data: which features you use, how often, and general interaction patterns</li>
              <li>Log data: IP address, access times, and pages or screens viewed</li>
              <li>Crash and performance data</li>
            </ul>
            <p className="mb-4">We do not use tracking cookies for advertising purposes. Kin is ad-free.</p>

            <h3 className="text-primary text-sm font-semibold mb-2">2.3 Information We Do Not Collect</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60">
              <li>Bank account credentials or financial transaction data (bank sync is a future feature with its own consent process)</li>
              <li>Social Security numbers, government ID numbers, or payment card numbers (Stripe handles payments)</li>
              <li>Biometric data</li>
              <li>Personal information directly from children under 13</li>
            </ul>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60 mb-3">
              <li>Provide personalized meal plans, grocery lists, budget summaries, and family scheduling assistance</li>
              <li>Power Kin&apos;s AI responses using the Anthropic API</li>
              <li>Send service-related communications</li>
              <li>Generate the weekly Sunday family briefing</li>
              <li>Respond to support requests</li>
              <li>Detect and prevent fraud, abuse, and security incidents</li>
            </ul>
            <p className="font-semibold text-warm-white/80">We do not sell your personal information. We do not use your information for advertising. We do not share your information with third parties for their marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">4. The Dual-Profile Privacy Architecture</h2>

            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4">
              <h3 className="text-primary text-sm font-semibold mb-2">Private Parent Profiles</h3>
              <ul className="list-disc pl-5 space-y-1 text-warm-white/60 text-xs">
                <li>Parent 1&apos;s private AI conversation thread is not accessible to Parent 2, and vice versa</li>
                <li>Each parent&apos;s individual wellness goals are visible only to that parent</li>
                <li>Kin will not share the contents of one parent&apos;s private thread with the other parent, even if directly asked</li>
              </ul>
            </div>

            <div className="bg-amber/10 border border-amber/20 rounded-2xl p-4">
              <h3 className="text-amber text-sm font-semibold mb-2">Shared Household Data</h3>
              <ul className="list-disc pl-5 space-y-1 text-warm-white/60 text-xs">
                <li>Household meal plan and grocery list</li>
                <li>Combined household budget totals by category (not individual line items)</li>
                <li>Merged family calendar view (shared events and kids&apos; schedules)</li>
                <li>Kids&apos; and pets&apos; profiles</li>
                <li>Date night suggestions and history</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">5. Children&apos;s Privacy (COPPA)</h2>
            <p className="mb-3">
              Kin is designed for parents and adult household members. The service is not directed at children under 13, and we do not knowingly collect personal information directly from children under 13.
            </p>
            <p>
              Parents may review, update, or delete their children&apos;s profile information at any time through the Kin app settings.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">6. Third-Party Services</h2>
            <div className="space-y-3">
              {[
                { name: "Anthropic", desc: "AI responses are generated via Anthropic API. Your family context is sent to generate responses. Anthropic does not use your data to train their models without consent." },
                { name: "Supabase", desc: "Your family data, conversation history, and account information is stored in Supabase with encrypted infrastructure in the United States." },
                { name: "Stripe", desc: "Subscription payments are processed by Stripe. We never store your full payment card details." },
                { name: "RevenueCat", desc: "If you subscribe through the App Store or Google Play, RevenueCat manages your subscription status." },
              ].map((s) => (
                <div key={s.name} className="bg-surface-raised rounded-xl p-3">
                  <p className="text-warm-white/80 text-xs font-semibold mb-1">{s.name}</p>
                  <p className="text-warm-white/50 text-xs">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">7. Data Retention and Deletion</h2>
            <p className="mb-3">
              When you cancel your subscription, your account enters a <strong className="text-warm-white/80">90-day grace period</strong>. During this period, your data is retained and you can reactivate at any time. After 90 days, your data is permanently deleted. You will receive an email reminder at day 75.
            </p>
            <p>
              You may request immediate deletion at any time by emailing hello@kinai.family or through the account settings.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">8. Data Security</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60">
              <li>All data encrypted in transit using TLS</li>
              <li>All data encrypted at rest in Supabase</li>
              <li>Passwords hashed using bcrypt</li>
              <li>Access to production data limited to essential personnel only</li>
              <li>Regular security reviews of infrastructure</li>
            </ul>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">9. Your Rights</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60">
              <li><strong className="text-warm-white/70">Access:</strong> Request a copy of your personal information</li>
              <li><strong className="text-warm-white/70">Correction:</strong> Update your information in the app at any time</li>
              <li><strong className="text-warm-white/70">Deletion:</strong> Request deletion as described in Section 7</li>
              <li><strong className="text-warm-white/70">Portability:</strong> Request an export in machine-readable format</li>
              <li><strong className="text-warm-white/70">Opt-out:</strong> Opt out of non-essential communications</li>
            </ul>
            <p className="mt-3">Contact us at hello@kinai.family. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">10. California Privacy Rights (CCPA/CPRA)</h2>
            <p>
              California residents have additional rights: the right to know what personal information we collect, the right to delete, the right to opt out of sale (we do not sell personal information), and the right to non-discrimination. Contact hello@kinai.family.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">11. Canadian Privacy Rights (PIPEDA)</h2>
            <p>
              Canadian residents&apos; personal information is handled in accordance with PIPEDA and applicable provincial legislation. You have the right to access, challenge accuracy, withdraw consent, and file complaints with the Office of the Privacy Commissioner of Canada. Quebec residents have additional rights under Law 25.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">12. Changes to This Policy</h2>
            <p>
              We will notify you by email and through the app at least 14 days before material changes take effect.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">13. Contact Us</h2>
            <p className="mb-1">Kin Technologies LLC</p>
            <p>Email: <span className="text-primary">hello@kinai.family</span></p>
            <p>Website: kinai.family</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-warm-white/10 flex gap-4">
          <Link href="/terms" className="text-warm-white/30 text-sm hover:text-warm-white/50 transition-colors">
            Terms of Service
          </Link>
          <Link href="/pricing" className="text-warm-white/30 text-sm hover:text-warm-white/50 transition-colors">
            Pricing
          </Link>
        </div>
      </div>
    </main>
  );
}
