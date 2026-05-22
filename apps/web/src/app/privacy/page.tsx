import { KinMark } from "@/components/KinMark";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Kin",
  description: "How Kin collects, uses, and protects your data.",
};

const LAST_UPDATED = "April 1, 2026";
const COMPANY = "Kin Technologies LLC";
const APP = "Kin AI";
const EMAIL = "hello@kinai.family";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "48px" }}>
      <h2
        style={{
          fontSize: "19px",
          fontWeight: 600,
          color: "var(--ink)",
          letterSpacing: "-0.4px",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid var(--border-2)",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: "15px",
          color: "var(--ink-2)",
          lineHeight: 1.75,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
      {items.map((item, i) => (
        <li key={i} style={{ listStyleType: "disc" }}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <div className="marketing" style={{ backgroundColor: "var(--bg)", color: "var(--ink)", minHeight: "100vh" }}>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: "64px",
          borderBottom: "1px solid var(--border)",
          background: "var(--paper)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "9px" }}>
          <KinMark size={26} color="#3C4A33" />
          <span style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.4px", color: "var(--ink)" }}>Kin</span>
        </Link>
        <Link href="/" style={{ fontSize: "13px", color: "var(--ink-3)" }}>← Back</Link>
      </nav>

      <article style={{ maxWidth: "680px", margin: "0 auto", padding: "64px 24px 100px" }}>
        <div style={{ marginBottom: "52px" }}>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 500,
              fontFamily: "var(--font-geist-mono), monospace",
              letterSpacing: "1.6px",
              textTransform: "uppercase",
              color: "var(--ink-3)",
              marginBottom: "18px",
            }}
          >
            Legal · Last updated {LAST_UPDATED}
          </p>
          <h1
            style={{
              fontSize: "clamp(32px, 5vw, 40px)",
              fontWeight: 600,
              letterSpacing: "-1px",
              lineHeight: 1.15,
              marginBottom: "24px",
              color: "var(--ink)",
            }}
          >
            Privacy Policy
          </h1>
          <div
            style={{
              background: "var(--paper)",
              border: "1px solid var(--border)",
              borderLeft: "2px solid var(--green)",
              borderRadius: "0 12px 12px 0",
              padding: "18px 22px",
              boxShadow: "0 1px 2px rgba(43,38,30,0.06), 0 6px 16px rgba(43,38,30,0.06)",
            }}
          >
            <p style={{ fontSize: "15px", color: "var(--ink-2)", lineHeight: 1.7, fontStyle: "italic" }}>
              {APP} is built on trust. We collect only what we need, use it to serve you, and give you full control over your data.
            </p>
          </div>
        </div>

        <Section title="1. Who We Are">
          <p>{APP} is operated by {COMPANY} (&ldquo;Kin,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). This Privacy Policy explains how we collect, use, disclose, and protect information about you when you use our website (kinai.family), text messaging service, and related services (collectively, the &ldquo;Service&rdquo;).</p>
          <p>Questions? Contact us at <a href={`mailto:${EMAIL}`} style={{ color: "var(--green)", fontWeight: 500 }}>{EMAIL}</a>.</p>
        </Section>

        <Section title="2. Information We Collect">
          <p><strong style={{ color: "var(--ink)" }}>Account information.</strong> When you create an account, we collect your name, email address, and any profile information you provide.</p>
          <p><strong style={{ color: "var(--ink)" }}>Calendar data.</strong> With your explicit permission, we access your Google Calendar with read-only permission. We read your calendar to understand your schedule and build your briefings — Kin never writes to, modifies, or deletes events on your calendar. We do not access your calendar without your consent.</p>
          <p><strong style={{ color: "var(--ink)" }}>Household data.</strong> You may optionally add information about your household including partner details, children&apos;s names, ages, and activities, and other family members. This information is used only to personalize your Kin experience.</p>
          <p><strong style={{ color: "var(--ink)" }}>Usage data.</strong> We automatically collect information about how you use the Service, including features accessed, interactions with Kin&apos;s AI, session data, and diagnostic information.</p>
          <p><strong style={{ color: "var(--ink)" }}>Device information.</strong> We collect device type, operating system, and browser version to provide support and improve the Service.</p>
          <p><strong style={{ color: "var(--ink)" }}>Payment information.</strong> Subscription billing is handled entirely by Stripe. Payment card details are collected and stored by Stripe — we never see or store your full card number.</p>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <Ul items={[
            "Provide, operate, and improve the Kin AI service",
            "Generate personalized family schedule briefings and reminders",
            "Detect scheduling conflicts and notify you proactively",
            "Sync and manage your calendar events with your permission",
            "Process your subscription and manage billing",
            "Send important service communications",
            "Respond to support requests",
            "Detect and prevent fraud, abuse, and security issues",
            "Comply with legal obligations",
          ]} />
          <p>We do not sell your personal information to third parties. We do not use your calendar data for advertising purposes.</p>
        </Section>

        <Section title="4. AI Processing">
          <p>{APP} uses artificial intelligence to analyze your calendar, generate briefings, and provide scheduling insights. This processing is performed using Anthropic&apos;s Claude AI platform. Your calendar data and household context may be sent to Anthropic to generate AI responses on your behalf.</p>
          <p>Anthropic processes data under data processing agreements that restrict the use of your data for model training. For Anthropic&apos;s privacy practices, see <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--green)", fontWeight: 500 }}>anthropic.com/privacy</a>.</p>
          <p>We minimize the data sent to AI systems — only the information necessary to answer your query or generate your briefing is transmitted.</p>
        </Section>

        <Section title="5. Data Sharing and Third Parties">
          <p>We share your data with the following service providers:</p>
          <Ul items={[
            "Supabase — database and authentication infrastructure. Data stored in the United States.",
            "Google — calendar access via Google OAuth. Subject to Google's Privacy Policy.",
            "Anthropic — AI inference for generating schedule briefings and insights.",
            "Stripe — subscription billing via Stripe Checkout and the Stripe Customer Portal. Payment card data is collected and stored by Stripe; we never see or store full card numbers.",
            "Twilio — SMS delivery for your morning briefing and reminders.",
            "Sentry — error tracking and crash reporting. Anonymized diagnostic data only.",
          ]} />
          <p>We may also disclose your information if required by law, to protect the safety of our users, or in connection with a merger or acquisition (in which case you will be notified).</p>
        </Section>

        <Section title="6. Google Calendar Access">
          <p>Kin requests access to your Google Calendar using OAuth 2.0. We request <strong style={{ color: "var(--ink)" }}>read-only access</strong> to view your schedule. Kin never writes to, modifies, or deletes events on your calendar.</p>
          <p><strong style={{ color: "var(--ink)" }}>Scope of use:</strong> We access only the calendars you authorize during setup. We do not share your calendar data with other users except your connected household partner(s).</p>
          <p>You can revoke Kin&apos;s access to your Google Calendar at any time from your Google Account settings at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: "var(--green)", fontWeight: 500 }}>myaccount.google.com/permissions</a>.</p>
          <p>Kin&apos;s use of Google user data complies with the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--green)", fontWeight: 500 }}>Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
        </Section>

        <Section title="7. Data Retention">
          <p>We retain your account and calendar data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law.</p>
          <p>AI interaction logs may be retained in anonymized or aggregated form for up to 12 months to improve our service.</p>
        </Section>

        <Section title="8. Your Rights and Controls">
          <p><strong style={{ color: "var(--ink)" }}>Access and correction.</strong> You can view and update your account information in your dashboard at any time.</p>
          <p><strong style={{ color: "var(--ink)" }}>Deletion.</strong> To delete your account, email <a href="mailto:hello@kinai.family?subject=Delete%20my%20account" style={{ color: "var(--green)", fontWeight: 500 }}>hello@kinai.family</a> with the subject &ldquo;Delete my account&rdquo; from the email address on file. We will permanently remove your profile, household data, and calendar access within 30 days.</p>
          <p><strong style={{ color: "var(--ink)" }}>Subscription management.</strong> You can manage or cancel your subscription at any time from /dashboard/billing, which opens the Stripe Customer Portal.</p>
          <p><strong style={{ color: "var(--ink)" }}>Data export.</strong> You may request a copy of your data by contacting us at <a href={`mailto:${EMAIL}`} style={{ color: "var(--green)", fontWeight: 500 }}>{EMAIL}</a>. We will provide your data in a machine-readable format within 30 days.</p>
          <p><strong style={{ color: "var(--ink)" }}>Calendar access.</strong> You can revoke Google Calendar access without deleting your account. Some features will be unavailable without calendar access.</p>
        </Section>

        <Section title="9. GDPR Rights (EEA and UK Users)">
          <p>If you are in the European Economic Area or United Kingdom, you have additional rights under GDPR:</p>
          <Ul items={[
            "Right to access — obtain a copy of your personal data",
            "Right to rectification — correct inaccurate or incomplete data",
            "Right to erasure — request deletion ('right to be forgotten')",
            "Right to restriction — limit how we process your data",
            "Right to portability — receive your data in a machine-readable format",
            "Right to object — object to processing based on legitimate interests",
          ]} />
          <p>Our legal basis for processing: (a) contract performance — to provide the service; (b) legitimate interests — to improve and secure the service; (c) consent — for Google Calendar access. To exercise rights, contact <a href={`mailto:${EMAIL}`} style={{ color: "var(--green)", fontWeight: 500 }}>{EMAIL}</a>.</p>
        </Section>

        <Section title="10. CCPA Rights (California Residents)">
          <p>California residents have rights under the CCPA, as amended by the CPRA:</p>
          <Ul items={[
            "Right to know what personal information we collect, use, disclose, and sell",
            "Right to delete your personal information",
            "Right to opt-out of sale or sharing of personal information",
            "Right to correct inaccurate personal information",
            "Right to non-discrimination for exercising your rights",
          ]} />
          <p>We do not sell or share personal information as defined by the CCPA. To submit a request, contact <a href={`mailto:${EMAIL}`} style={{ color: "var(--green)", fontWeight: 500 }}>{EMAIL}</a>.</p>
        </Section>

        <Section title="11. Children's Privacy">
          <p>Kin is designed for use by adults managing family schedules. The Service is not directed to children under 13. We do not knowingly collect personal information from children under 13.</p>
          <p>Parents may enter information about their children (such as names and activities) as part of managing household schedules. This data is managed by the adult account holder.</p>
        </Section>

        <Section title="12. Security">
          <p>We implement encryption in transit (TLS), encryption at rest, access controls, and security monitoring to protect your data. We use Sentry for error tracking to identify and respond to issues promptly.</p>
          <p>If you discover a security vulnerability, contact <a href={`mailto:${EMAIL}`} style={{ color: "var(--green)", fontWeight: 500 }}>{EMAIL}</a>.</p>
        </Section>

        <Section title="13. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on the website and, where required by law, by email.</p>
          <p>This policy was last updated on {LAST_UPDATED}.</p>
        </Section>

        <Section title="14. Contact">
          <p><strong style={{ color: "var(--ink)" }}>{COMPANY}</strong><br /><a href={`mailto:${EMAIL}`} style={{ color: "var(--green)", fontWeight: 500 }}>{EMAIL}</a></p>
        </Section>
      </article>

      <footer style={{ borderTop: "1px solid var(--border)", background: "var(--bg-deep)", padding: "28px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "12px", color: "var(--ink-3)" }}>
          © 2026 {COMPANY} · <Link href="/terms" style={{ color: "var(--green)", fontWeight: 500 }}>Terms</Link> · <a href={`mailto:${EMAIL}`} style={{ color: "var(--green)", fontWeight: 500 }}>{EMAIL}</a>
        </p>
      </footer>
    </div>
  );
}
