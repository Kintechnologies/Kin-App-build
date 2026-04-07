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
          fontSize: "18px",
          fontWeight: 600,
          color: "#F0EDE6",
          letterSpacing: "-0.3px",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: "15px",
          color: "rgba(240,237,230,0.65)",
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
    <div style={{ backgroundColor: "#0C0F0A", color: "#F0EDE6", minHeight: "100vh" }}>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: "60px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <KinMark size={24} />
          <span style={{ fontSize: "16px", fontWeight: 500, letterSpacing: "-0.2px" }}>Kin</span>
        </Link>
        <Link href="/" style={{ fontSize: "13px", color: "rgba(240,237,230,0.4)" }}>← Back</Link>
      </nav>

      <article style={{ maxWidth: "680px", margin: "0 auto", padding: "60px 24px 100px" }}>
        <div style={{ marginBottom: "48px" }}>
          <p
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-geist-mono), monospace",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "rgba(240,237,230,0.3)",
              marginBottom: "16px",
            }}
          >
            Legal · Last updated {LAST_UPDATED}
          </p>
          <h1
            style={{
              fontSize: "36px",
              fontWeight: 600,
              letterSpacing: "-0.8px",
              lineHeight: 1.15,
              marginBottom: "16px",
            }}
          >
            Privacy Policy
          </h1>
          <p style={{ fontSize: "15px", color: "rgba(240,237,230,0.55)", lineHeight: 1.65, fontStyle: "italic" }}>
            {APP} is built on trust. We collect only what we need, use it to serve you, and give you full control over your data.
          </p>
        </div>

        <Section title="1. Who We Are">
          <p>{APP} is operated by {COMPANY} (&ldquo;Kin,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). This Privacy Policy explains how we collect, use, disclose, and protect information about you when you use our mobile application, website (kinai.family), and related services (collectively, the &ldquo;Service&rdquo;).</p>
          <p>Questions? Contact us at <a href={`mailto:${EMAIL}`} style={{ color: "#7CB87A" }}>{EMAIL}</a>.</p>
        </Section>

        <Section title="2. Information We Collect">
          <p><strong style={{ color: "#F0EDE6" }}>Account information.</strong> When you create an account, we collect your name, email address, and any profile information you provide.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Calendar data.</strong> With your explicit permission, we access your Google Calendar to read and write events on your behalf. We read your calendar to understand your schedule and write to it when you ask Kin to add or modify events. We do not access your calendar without your consent.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Household data.</strong> You may optionally add information about your household including partner details, children&apos;s names, ages, and activities, and other family members. This information is used only to personalize your Kin experience.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Usage data.</strong> We automatically collect information about how you use the Service, including features accessed, interactions with Kin&apos;s AI, app session data, and diagnostic information.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Device information.</strong> We collect device type, operating system, and app version to provide support and improve the Service.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Payment information.</strong> Subscription billing is handled entirely by RevenueCat and Apple/Google. We do not store your payment card details.</p>
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
          <p>Anthropic processes data under data processing agreements that restrict the use of your data for model training. For Anthropic&apos;s privacy practices, see <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#7CB87A" }}>anthropic.com/privacy</a>.</p>
          <p>We minimize the data sent to AI systems — only the information necessary to answer your query or generate your briefing is transmitted.</p>
        </Section>

        <Section title="5. Data Sharing and Third Parties">
          <p>We share your data with the following service providers:</p>
          <Ul items={[
            "Supabase — database and authentication infrastructure. Data stored in the United States.",
            "Google — calendar access via Google OAuth. Subject to Google's Privacy Policy.",
            "Anthropic — AI inference for generating schedule briefings and insights.",
            "RevenueCat — subscription management and billing. No payment card data is shared with us.",
            "Sentry — error tracking and crash reporting. Anonymized diagnostic data only.",
          ]} />
          <p>We may also disclose your information if required by law, to protect the safety of our users, or in connection with a merger or acquisition (in which case you will be notified).</p>
        </Section>

        <Section title="6. Google Calendar Access">
          <p>Kin requests access to your Google Calendar using OAuth 2.0. We request read and write access to view your schedule and add events on your behalf.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Scope of use:</strong> We access only the calendars you authorize during setup. We do not share your calendar data with other users except your connected household partner(s).</p>
          <p>You can revoke Kin&apos;s access to your Google Calendar at any time from your Google Account settings at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: "#7CB87A" }}>myaccount.google.com/permissions</a>.</p>
          <p>Kin&apos;s use of Google user data complies with the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: "#7CB87A" }}>Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
        </Section>

        <Section title="7. Data Retention">
          <p>We retain your account and calendar data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law.</p>
          <p>AI interaction logs may be retained in anonymized or aggregated form for up to 12 months to improve our service.</p>
        </Section>

        <Section title="8. Your Rights and Controls">
          <p><strong style={{ color: "#F0EDE6" }}>Access and correction.</strong> You can view and update your account information within the Kin app at any time.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Deletion.</strong> You can delete your account from Settings → Account → Delete Account. This will permanently remove your profile, household data, and calendar access.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Data export.</strong> You may request a copy of your data by contacting us at <a href={`mailto:${EMAIL}`} style={{ color: "#7CB87A" }}>{EMAIL}</a>. We will provide your data in a machine-readable format within 30 days.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Calendar access.</strong> You can revoke Google Calendar access without deleting your account. Some features will be unavailable without calendar access.</p>
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
          <p>Our legal basis for processing: (a) contract performance — to provide the service; (b) legitimate interests — to improve and secure the service; (c) consent — for Google Calendar access. To exercise rights, contact <a href={`mailto:${EMAIL}`} style={{ color: "#7CB87A" }}>{EMAIL}</a>.</p>
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
          <p>We do not sell or share personal information as defined by the CCPA. To submit a request, contact <a href={`mailto:${EMAIL}`} style={{ color: "#7CB87A" }}>{EMAIL}</a>.</p>
        </Section>

        <Section title="11. Children's Privacy">
          <p>Kin is designed for use by adults managing family schedules. The Service is not directed to children under 13. We do not knowingly collect personal information from children under 13.</p>
          <p>Parents may enter information about their children (such as names and activities) as part of managing household schedules. This data is managed by the adult account holder.</p>
        </Section>

        <Section title="12. Security">
          <p>We implement encryption in transit (TLS), encryption at rest, access controls, and security monitoring to protect your data. We use Sentry for error tracking to identify and respond to issues promptly.</p>
          <p>If you discover a security vulnerability, contact <a href={`mailto:${EMAIL}`} style={{ color: "#7CB87A" }}>{EMAIL}</a>.</p>
        </Section>

        <Section title="13. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy in the app and, where required by law, by email.</p>
          <p>This policy was last updated on {LAST_UPDATED}.</p>
        </Section>

        <Section title="14. Contact">
          <p><strong style={{ color: "#F0EDE6" }}>{COMPANY}</strong><br /><a href={`mailto:${EMAIL}`} style={{ color: "#7CB87A" }}>{EMAIL}</a></p>
        </Section>
      </article>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px", textAlign: "center" }}>
        <p style={{ fontSize: "12px", color: "rgba(240,237,230,0.25)" }}>
          © 2026 {COMPANY} · <Link href="/terms" style={{ color: "rgba(240,237,230,0.4)" }}>Terms</Link> · <a href={`mailto:${EMAIL}`} style={{ color: "rgba(240,237,230,0.4)" }}>{EMAIL}</a>
        </p>
      </footer>
    </div>
  );
}
