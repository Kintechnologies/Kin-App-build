import { KinMark } from "@/components/KinMark";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Kin",
  description: "Terms governing your use of Kin AI.",
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

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <p style={{ fontSize: "15px", color: "rgba(240,237,230,0.55)", lineHeight: 1.65, fontStyle: "italic" }}>
            Please read these Terms carefully before using {APP}. By using the Service, you agree to these Terms.
          </p>
        </div>

        <Section title="1. Agreement to Terms">
          <p>These Terms of Service (&ldquo;Terms&rdquo;) are a binding legal agreement between you and {COMPANY} (&ldquo;Kin,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) governing your access to and use of the {APP} mobile application, website (kinai.family), and related services (collectively, the &ldquo;Service&rdquo;).</p>
          <p>By creating an account or using the Service, you confirm that you are at least 18 years old, have the legal capacity to enter into this agreement, and agree to be bound by these Terms and our <Link href="/privacy" style={{ color: "#7CB87A" }}>Privacy Policy</Link>.</p>
          <p>If you do not agree to these Terms, do not use the Service.</p>
        </Section>

        <Section title="2. The Service">
          <p>{APP} is a family scheduling assistant that connects to your calendar, analyzes your schedule, and proactively tells you what you need to know — including pickup responsibilities, schedule conflicts, and time-sensitive tasks. The Service uses AI to generate briefings and suggestions.</p>
          <p>We reserve the right to modify, suspend, or discontinue any part of the Service at any time. We will provide reasonable notice of material changes where possible.</p>
        </Section>

        <Section title="3. Accounts">
          <p>You must create an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</p>
          <p>You agree to provide accurate, current, and complete information during registration and to update it as needed. We may suspend or terminate accounts that contain inaccurate information or that we believe are being used fraudulently.</p>
          <p>You may not share your account with others or create accounts on behalf of third parties without authorization.</p>
        </Section>

        <Section title="4. Subscriptions and Billing">
          <p>{APP} is offered on a subscription basis. Subscriptions are available on a monthly or annual basis. Pricing is displayed in the App Store and Google Play Store at the time of purchase.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Billing.</strong> Subscriptions are billed through Apple App Store or Google Play, managed by RevenueCat. By subscribing, you authorize the applicable app store to charge your payment method on a recurring basis at the start of each billing period.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Free trials.</strong> If a free trial is offered, your subscription will automatically begin at the end of the trial period unless you cancel before the trial ends.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Cancellations.</strong> You may cancel your subscription at any time through your App Store or Google Play account settings. Cancellation takes effect at the end of the current billing period. We do not provide refunds for partial billing periods except as required by applicable law.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Price changes.</strong> We may change subscription pricing with reasonable advance notice. Continued use of the Service after a price change constitutes acceptance of the new pricing.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Refunds.</strong> Refund requests are subject to the refund policies of Apple App Store and Google Play. Contact <a href={`mailto:${EMAIL}`} style={{ color: "#7CB87A" }}>{EMAIL}</a> if you have billing questions.</p>
        </Section>

        <Section title="5. Acceptable Use">
          <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
          <Ul items={[
            "Use the Service for any illegal purpose or in violation of any applicable law",
            "Attempt to gain unauthorized access to the Service, other accounts, or our systems",
            "Interfere with or disrupt the integrity or performance of the Service",
            "Transmit any malicious code, viruses, or harmful data",
            "Scrape, harvest, or collect data from the Service without authorization",
            "Use the Service to harass, abuse, or harm others",
            "Impersonate any person or entity",
            "Reverse engineer, decompile, or disassemble any part of the Service",
            "Remove or alter any proprietary notices or labels",
            "Use automated means to access the Service except as permitted by us",
          ]} />
        </Section>

        <Section title="6. Calendar Integration and Third-Party Services">
          <p>The Service integrates with Google Calendar and may integrate with other third-party calendar services. Your use of these integrations is subject to the terms and privacy policies of those third parties.</p>
          <p>By connecting your calendar, you authorize Kin to read your calendar data and, where applicable, create and modify events on your behalf. You can revoke this access at any time.</p>
          <p>We are not responsible for the availability, accuracy, or security of third-party services. If a third-party service changes its API or terms, we may need to modify or discontinue the relevant integration.</p>
        </Section>

        <Section title="7. AI-Generated Content">
          <p>The Service uses artificial intelligence to generate schedule briefings, insights, reminders, and suggestions (&ldquo;AI Content&rdquo;). You acknowledge that:</p>
          <Ul items={[
            "AI Content is generated automatically and may contain errors or inaccuracies",
            "AI Content is provided for informational purposes only and is not a substitute for your own judgment",
            "Kin is not responsible for any decisions you make based on AI Content",
            "AI Content is not legal, medical, financial, or professional advice",
            "The accuracy of AI Content depends on the accuracy of your calendar data and account information",
          ]} />
          <p>You are solely responsible for verifying time-sensitive information (such as pickup times, appointment details, and deadlines) against your original calendar and other sources.</p>
        </Section>

        <Section title="8. Household and Partner Features">
          <p>Kin supports shared household accounts where multiple adult users (&ldquo;Household Members&rdquo;) can connect their calendars and coordinate schedules.</p>
          <p>By connecting with a partner or joining a household:</p>
          <Ul items={[
            "You consent to sharing your calendar availability and schedule information with connected Household Members",
            "You acknowledge that Kin may share schedule insights and coordination suggestions with Household Members",
            "You are responsible for obtaining the consent of any person whose information you add to the household",
          ]} />
          <p>Household Members can be removed at any time from your account settings. Removing a Household Member will end their access to shared schedule information.</p>
        </Section>

        <Section title="9. Your Data and Content">
          <p>You own your data. {COMPANY} does not claim ownership of the calendar data, household information, or other content you provide to the Service (&ldquo;Your Content&rdquo;).</p>
          <p>By using the Service, you grant {COMPANY} a limited, non-exclusive, worldwide license to access, process, and store Your Content solely to provide and improve the Service.</p>
          <p>You represent that you have the right to share all content you provide to the Service, including calendar data and information about household members.</p>
        </Section>

        <Section title="10. Intellectual Property">
          <p>The Service and its original content, features, and functionality are owned by {COMPANY} and are protected by copyright, trademark, and other intellectual property laws.</p>
          <p>The Kin name, logo, and brand marks are trademarks of {COMPANY}. You may not use our trademarks without our prior written consent.</p>
          <p>We grant you a limited, non-exclusive, non-transferable license to use the Service for your personal, non-commercial use in accordance with these Terms.</p>
        </Section>

        <Section title="11. Disclaimer of Warranties">
          <p>THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY.</p>
          <p>WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. WE DO NOT WARRANT THE ACCURACY OR COMPLETENESS OF AI-GENERATED CONTENT.</p>
          <p>Some jurisdictions do not allow the exclusion of implied warranties, so the above exclusions may not apply to you.</p>
        </Section>

        <Section title="12. Limitation of Liability">
          <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, {COMPANY.toUpperCase()} AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR:</p>
          <Ul items={[
            "Any indirect, incidental, special, consequential, or punitive damages",
            "Loss of profits, data, goodwill, or other intangible losses",
            "Damages resulting from your reliance on AI-generated content",
            "Unauthorized access to or alteration of your data",
            "Damages resulting from third-party service failures (including Google Calendar)",
          ]} />
          <p>IN NO EVENT WILL OUR TOTAL LIABILITY TO YOU EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM OR (B) ONE HUNDRED DOLLARS ($100).</p>
          <p>Some jurisdictions do not allow limitations on liability for certain types of damages, so some of the above may not apply to you.</p>
        </Section>

        <Section title="13. Indemnification">
          <p>You agree to indemnify, defend, and hold harmless {COMPANY} and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising from:</p>
          <Ul items={[
            "Your use of the Service",
            "Your violation of these Terms",
            "Your violation of any rights of a third party",
            "Your Content",
          ]} />
        </Section>

        <Section title="14. Termination">
          <p>You may terminate your account at any time by deleting your account from Settings → Account → Delete Account.</p>
          <p>We may suspend or terminate your access to the Service at any time, with or without notice, if we believe you have violated these Terms, engaged in fraudulent activity, or for any other reason at our sole discretion.</p>
          <p>Upon termination, your right to use the Service will immediately cease. Sections that by their nature should survive termination (including Sections 9–16) will survive.</p>
        </Section>

        <Section title="15. Governing Law and Dispute Resolution">
          <p>These Terms are governed by the laws of the state where {COMPANY} is registered, without regard to its conflict of law provisions.</p>
          <p>Any dispute arising from these Terms or your use of the Service that cannot be resolved informally will be submitted to binding arbitration under the rules of the American Arbitration Association, except that either party may seek injunctive or other equitable relief in a court of competent jurisdiction.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Class action waiver.</strong> You agree to bring claims against Kin only in your individual capacity and not as a plaintiff or class member in any class action.</p>
          <p>If you are an EU consumer, you may have the right to bring disputes before the courts of your country of residence.</p>
        </Section>

        <Section title="16. General Provisions">
          <p><strong style={{ color: "#F0EDE6" }}>Entire agreement.</strong> These Terms and our Privacy Policy constitute the entire agreement between you and {COMPANY} regarding the Service.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Severability.</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.</p>
          <p><strong style={{ color: "#F0EDE6" }}>No waiver.</strong> Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.</p>
          <p><strong style={{ color: "#F0EDE6" }}>Changes to Terms.</strong> We may update these Terms from time to time. We will notify you of material changes by posting an updated version and, where appropriate, by email. Continued use of the Service after changes constitutes acceptance.</p>
        </Section>

        <Section title="17. Contact">
          <p>Questions about these Terms? Contact us:</p>
          <p><strong style={{ color: "#F0EDE6" }}>{COMPANY}</strong><br /><a href={`mailto:${EMAIL}`} style={{ color: "#7CB87A" }}>{EMAIL}</a></p>
        </Section>
      </article>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px", textAlign: "center" }}>
        <p style={{ fontSize: "12px", color: "rgba(240,237,230,0.25)" }}>
          © 2026 {COMPANY} · <Link href="/privacy" style={{ color: "rgba(240,237,230,0.4)" }}>Privacy</Link> · <a href={`mailto:${EMAIL}`} style={{ color: "rgba(240,237,230,0.4)" }}>{EMAIL}</a>
        </p>
      </footer>
    </div>
  );
}
