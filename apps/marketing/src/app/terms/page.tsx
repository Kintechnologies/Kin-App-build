import Link from "next/link";

export default function TermsPage() {
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
            <span style={{ color: "var(--text2)", cursor: "pointer" }}>Privacy</span>
          </Link>
          <Link href="/terms">
            <span style={{ color: "var(--green)", cursor: "pointer" }}>Terms</span>
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
        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "2rem" }}>Terms of Service</h1>
        <p style={{ color: "var(--text2)", marginBottom: "1rem" }}>
          <strong>Effective Date: April 6, 2026</strong>
        </p>
        <p style={{ color: "var(--text2)", marginBottom: "2rem" }}>
          Last Updated: April 6, 2026
        </p>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            1. Acceptance of Terms
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            By downloading, accessing, or using Kin (the "Service"), you agree to be bound by these Terms of Service.
            If you do not accept these terms, you may not use Kin. Kin Technologies LLC ("Kin," "we," "our," or "us")
            reserves the right to modify these terms at any time. Continued use of the Service constitutes acceptance of
            modified terms.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            2. Service Description
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            Kin is an AI-powered family scheduling application that helps families coordinate schedules, manage family
            events, and receive AI-generated insights and suggestions. The Service includes:
          </p>
          <ul style={{ color: "var(--text2)", lineHeight: 1.8, marginLeft: "1.5rem", marginBottom: "1rem" }}>
            <li>Family calendar management and synchronization</li>
            <li>AI-generated briefings and scheduling suggestions</li>
            <li>Household member coordination and notifications</li>
            <li>Integration with Google Calendar</li>
            <li>Optional subscription features via in-app purchases</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            3. User Accounts
          </h2>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            3.1 Account Creation
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            To use Kin, you must create an account with accurate information. You are responsible for maintaining the
            confidentiality of your password and all account activity. You agree to notify us immediately of any
            unauthorized access.
          </p>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            3.2 Eligibility
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            Kin is intended for adults (18+). By using the Service, you represent that you are at least 18 years old
            and have the legal capacity to enter into this agreement.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            4. Your Responsibilities
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            You agree to:
          </p>
          <ul style={{ color: "var(--text2)", lineHeight: 1.8, marginLeft: "1.5rem", marginBottom: "1rem" }}>
            <li>Use Kin only for lawful purposes and in compliance with all applicable laws</li>
            <li>Not use Kin to harass, abuse, or harm any person or group</li>
            <li>Not reverse-engineer, decompile, or attempt to derive source code</li>
            <li>Not upload malware, viruses, or malicious code</li>
            <li>Not attempt unauthorized access to Kin's systems or other users' accounts</li>
            <li>Not scrape, crawl, or automate access to Kin without permission</li>
            <li>Obtain proper consent from household members before inviting them to Kin</li>
            <li>Maintain accurate and current account information</li>
          </ul>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            5. Subscriptions & Billing
          </h2>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            5.1 Subscription Plans
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            Kin offers optional subscription plans (monthly and annual). Free features are available without a
            subscription.
          </p>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            5.2 Billing
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            Subscriptions are billed through RevenueCat and charged to your payment method on file. You authorize us to
            charge your account for the selected plan. Billing occurs on the date your subscription renews. All prices
            are subject to change with 30 days' notice.
          </p>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            5.3 Renewal & Cancellation
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            Subscriptions automatically renew unless canceled. You can cancel at any time through in-app settings or by
            contacting hello@kinai.family. Cancellation takes effect at the end of the current billing period. No
            refunds are provided for partial months.
          </p>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            5.4 Refunds
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            Unless required by law, no refunds are provided for unused subscription time. If a payment fails, you remain
            responsible for any fees incurred.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            6. Intellectual Property Rights
          </h2>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            6.1 Kin's IP
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            All content, features, and functionality of Kin (including software, design, graphics, text) are owned by
            Kin Technologies LLC or its licensors and are protected by copyright, trademark, and other laws.
          </p>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            6.2 Your License
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            We grant you a limited, non-exclusive, non-transferable license to access and use Kin for personal,
            non-commercial purposes only.
          </p>

          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem", marginTop: "1rem" }}>
            6.3 User Content
          </h3>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            You retain ownership of any content you create (calendar events, household information) but grant Kin a
            license to use, process, and display this content to provide the Service. You warrant that you have the
            right to grant such licenses.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            7. AI-Generated Content
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            Kin uses artificial intelligence (powered by Anthropic) to generate briefings, suggestions, and insights.
            These are based on your calendar and household data but are not guaranteed to be accurate or applicable to
            your situation. You are responsible for verifying AI-generated recommendations before acting on them.
          </p>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            AI-generated content may contain errors or may not reflect your true preferences. Kin is not liable for
            decisions made based on AI-generated content.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            8. Third-Party Services
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            Kin integrates with third-party services including Google Calendar, Supabase, RevenueCat, Sentry, and
            Anthropic. Your use of these services is subject to their terms and privacy policies. Kin is not
            responsible for third-party service availability, content, or practices.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            9. Limitation of Liability
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, KIN TECHNOLOGIES LLC SHALL NOT BE LIABLE FOR:
          </p>
          <ul style={{ color: "var(--text2)", lineHeight: 1.8, marginLeft: "1.5rem", marginBottom: "1rem" }}>
            <li>Indirect, incidental, special, or consequential damages</li>
            <li>Lost profits, revenue, data, or business opportunities</li>
            <li>Missed appointments, family events, or scheduling errors</li>
            <li>Errors or omissions in AI-generated content</li>
            <li>Third-party service failures or unavailability</li>
            <li>Any other damages arising from use or inability to use Kin</li>
          </ul>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            IN NO EVENT SHALL KIN'S TOTAL LIABILITY EXCEED THE TOTAL AMOUNT YOU PAID FOR SUBSCRIPTIONS IN THE PRIOR 12
            MONTHS.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            10. Disclaimer of Warranties
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            KIN IS PROVIDED "AS IS" AND "AS AVAILABLE." KIN MAKES NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING
            WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. KIN DOES NOT WARRANT
            THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            11. Indemnification
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            You agree to indemnify, defend, and hold harmless Kin Technologies LLC, its officers, employees, and
            agents from any claims, damages, losses, or expenses arising from (a) your violation of these Terms, (b)
            your use of Kin, or (c) your content or data.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            12. Termination
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            Kin may suspend or terminate your account immediately if you violate these Terms or engage in illegal
            activity. Upon termination, your right to use Kin ceases. You can delete your account at any time through
            app settings.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            13. Dispute Resolution
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            Any disputes arising from these Terms or your use of Kin shall be governed by and construed in accordance
            with the laws of the state where Kin Technologies LLC is registered, without regard to conflict of law
            principles.
          </p>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            You agree to submit to the exclusive jurisdiction of the state and federal courts located in that state for
            resolution of disputes.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            14. Governing Law
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            These Terms of Service are governed by and construed in accordance with the laws of the state where Kin
            Technologies LLC is registered, excluding its conflict of law provisions.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            15. Modifications to Service
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            Kin may modify, suspend, or discontinue the Service or any feature at any time, with or without notice.
            Material modifications will be communicated via email. Continued use constitutes acceptance of changes.
          </p>
        </section>

        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            16. Entire Agreement
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
            These Terms, along with our Privacy Policy, constitute the entire agreement between you and Kin regarding
            use of the Service and supersede all prior or contemporaneous agreements.
          </p>
        </section>

        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem", marginTop: "2rem" }}>
            17. Contact Us
          </h2>
          <p style={{ color: "var(--text2)", lineHeight: 1.6, marginBottom: "1rem" }}>
            If you have questions about these Terms of Service, please contact us:
          </p>
          <p style={{ color: "var(--text2)", lineHeight: 1.8 }}>
            <strong>Kin Technologies LLC</strong>
            <br />
            Email: hello@kinai.family
            <br />
            Legal Contact: legal@kinai.family
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
