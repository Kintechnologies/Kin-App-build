import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main style={{ backgroundColor: "var(--background)", color: "var(--text)" }}>
      {/* Navigation */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.5rem 2rem",
          backgroundColor: "var(--surface)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Link href="/">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="20" r="8" fill="#7CB87A" />
              <circle cx="21.75" cy="37.9" r="9" fill="#7CB87A" />
              <circle cx="42.25" cy="37.9" r="9" fill="#7CB87A" />
            </svg>
            <span style={{ fontSize: "1.25rem", fontWeight: 600 }}>Kin</span>
          </div>
        </Link>
        <div style={{ display: "flex", gap: "1rem" }}>
          <Link href="/privacy">
            <span style={{ color: "var(--green)", cursor: "pointer" }}>Privacy</span>
          </Link>
          <Link href="/terms">
            <span style={{ color: "var(--text2)", cursor: "pointer" }}>Terms</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <article
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          padding: "3rem 2rem",
        }}
      >
        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "2rem" }}>Privacy Policy</h1>
        <p style={{ color: "var(--text2)", marginBottom: "1rem" }}>
          <strong>Effective Date: April 6, 2026</strong>
        </p>
        <p style={{ color: "var(--text2)", marginBottom: "2rem" }}>
          Last Updated: April 6, 2026
        </p>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            1. Introduction
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            Kin Technologies LLC ("Kin," "we," "our," or "us") is committed to protecting your privacy. This Privacy
            Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered
            family scheduling application (the "Service").
          </p>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            Please read this Privacy Policy carefully. If you do not agree with our policies and practices, please do
            not use our Service.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            2. Information We Collect
          </h2>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            2.1 Information You Provide
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            We collect information you voluntarily provide when using Kin:
          </p>
          <ul style={{ color: "var(--text2)", lineHeight: 1.8, marginLeft: "1.5rem", marginBottom: "1rem" }}>
            <li>Account Information: name, email address, phone number</li>
            <li>Household Information: household members, relationships, roles</li>
            <li>Family Details: children's names and ages, pet details</li>
            <li>Calendar Data: via read/write integration with Google Calendar</li>
            <li>Preferences: notification settings, scheduling preferences, household rules</li>
            <li>Communication: emails, feedback, and support inquiries</li>
          </ul>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            2.2 Information Automatically Collected
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            When you use Kin, we automatically collect:
          </p>
          <ul style={{ color: "var(--text2)", lineHeight: 1.8, marginLeft: "1.5rem", marginBottom: "1rem" }}>
            <li>Device Information: device type, OS, app version, unique device identifiers</li>
            <li>Usage Data: features used, interaction patterns, session duration</li>
            <li>Crash Reports: via Sentry error tracking (anonymized)</li>
            <li>Location Data: optional, only if you enable location services</li>
            <li>IP Address and Log Data: for security and analytics</li>
          </ul>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            2.3 Third-Party Data
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            We receive data from Google OAuth when you authorize calendar integration and from RevenueCat for
            subscription management.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            3. How We Use Your Information
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            We use collected information for:
          </p>
          <ul style={{ color: "var(--text2)", lineHeight: 1.8, marginLeft: "1.5rem", marginBottom: "1rem" }}>
            <li>Service Delivery: providing family scheduling features, AI briefings, and suggestions</li>
            <li>Account Management: authentication, security, account recovery</li>
            <li>Communication: service updates, support responses, promotional emails (with consent)</li>
            <li>Improvement: analyzing usage patterns, fixing bugs, developing new features</li>
            <li>AI Personalization: generating personalized briefings and scheduling suggestions using Anthropic's API</li>
            <li>Legal Compliance: fulfilling legal obligations, preventing fraud</li>
            <li>Analytics: understanding how users interact with Kin (via anonymized data)</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            4. Sharing Your Information
          </h2>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            4.1 Service Providers
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            We share data with trusted third parties to operate Kin:
          </p>
          <ul style={{ color: "var(--text2)", lineHeight: 1.8, marginLeft: "1.5rem", marginBottom: "1rem" }}>
            <li>
              <strong>Supabase:</strong> Database and authentication (encryption in transit and at rest)
            </li>
            <li>
              <strong>Google:</strong> Calendar integration (read/write only after your OAuth authorization)
            </li>
            <li>
              <strong>Anthropic:</strong> AI processing for briefings and suggestions (data sent to generate personalized
              content)
            </li>
            <li>
              <strong>RevenueCat:</strong> Subscription billing and analytics (anonymized)
            </li>
            <li>
              <strong>Sentry:</strong> Error tracking and crash reporting (anonymized)
            </li>
          </ul>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            4.2 No Sale of Data
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            We do not sell, rent, or lease your personal information to third parties for marketing purposes.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            5. Data Retention
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            We retain your information for as long as your account is active or as needed to provide services. You can
            delete your account and associated data at any time through app settings. After deletion, we retain
            anonymized data for analytics and legal compliance for up to 90 days.
          </p>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            Crash logs and analytics data are automatically purged after 30 days.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            6. Your Privacy Rights
          </h2>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            6.1 Data Access & Export
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            You have the right to request a copy of your personal data. Contact us at hello@kinai.family to request a
            data export.
          </p>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            6.2 Data Deletion
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            You can delete your account and data directly in app settings. We will permanently delete all associated
            information within 30 days.
          </p>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            6.3 Opt-Out & Preferences
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            You can opt out of promotional emails by clicking the unsubscribe link. You can manage notification
            preferences in app settings.
          </p>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            6.4 GDPR & CCPA Rights
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            If you are in the EU or California, you have additional rights including the right to rectification,
            restriction, and data portability. Contact us for requests under GDPR or CCPA.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            7. Data Security
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            We implement industry-standard security measures to protect your data:
          </p>
          <ul style={{ color: "var(--text2)", lineHeight: 1.8, marginLeft: "1.5rem", marginBottom: "1rem" }}>
            <li>End-to-end encryption for sensitive calendar data</li>
            <li>HTTPS/TLS encryption for all data in transit</li>
            <li>Encryption at rest using Supabase's security standards</li>
            <li>Regular security audits and penetration testing</li>
            <li>Secure password hashing (bcrypt)</li>
            <li>API rate limiting and DDoS protection</li>
          </ul>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            While we strive to protect your data, no method of transmission over the internet is 100% secure. Please
            report security vulnerabilities to hello@kinai.family.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            8. Children's Privacy
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            Kin is intended for adults managing family schedules. We do not knowingly collect personal information from
            children under 13. If we discover we have collected data from a child under 13 without parental consent, we
            will delete it immediately.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            9. International Data Transfers
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            Kin is hosted in the United States. If you are accessing from outside the US, your data will be transferred
            to and stored in the US. By using Kin, you consent to this transfer.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            10. Third-Party Links
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            Kin may contain links to external websites and services. We are not responsible for their privacy practices.
            Please review their privacy policies before providing personal information.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            11. Your Data Ownership
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            You retain full ownership of your data. We do not use your personal information (names, email, household
            details) to train AI models or for purposes beyond providing the Service. Your calendar insights and
            briefings are generated using your data but are not used to improve our systems without explicit consent.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            12. Changes to This Policy
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            We may update this Privacy Policy from time to time. We will notify you of material changes by email or
            through the app. Continued use of Kin after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            13. Contact Us
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            If you have questions about this Privacy Policy or our privacy practices, please contact us:
          </p>
          <p style={{ color: "var(--text2)", lineHeight: 1.8 }}>
            <strong>Kin Technologies LLC</strong>
            <br />
            Email: hello@kinai.family
            <br />
            Data Protection Officer: privacy@kinai.family
          </p>
        </section>
      </article>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: "var(--surface)",
          borderTop: "1px solid var(--border)",
          padding: "2rem",
          marginTop: "4rem",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            textAlign: "center",
            color: "var(--text3)",
            fontSize: "0.875rem",
          }}
        >
          © 2026 Kin Technologies LLC
        </div>
      </footer>
    </main>
  );
}
