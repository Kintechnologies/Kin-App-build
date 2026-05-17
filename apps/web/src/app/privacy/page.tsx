import LegalShell, {
  LegalSection,
  LegalSubheading,
  LegalP,
  LegalUL,
  LegalLI,
  LegalStrong,
  LegalCallout,
  LegalEmail,
  T,
} from "@/components/LegalShell";

const Mono = ({ children }: { children: React.ReactNode }) => (
  <span style={{ fontFamily: T.mono, color: T.warm, fontSize: "0.92em" }}>
    {children}
  </span>
);

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Privacy Policy"
      title="How Kin handles your family's data."
      org="Kin Technologies LLC"
      updated="May 2026"
      intro={
        <>
          This Privacy Policy explains how Kin Technologies LLC (&ldquo;Kin,&rdquo;
          &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) collects,
          uses, stores, and protects information when you join the Kin waitlist,
          use Kin&apos;s SMS service, or visit the kinai.family website. Kin is
          currently available only to residents of the United States who are 18
          or older. By joining the waitlist or using Kin, you agree to the
          practices described here.
        </>
      }
    >
      <LegalSection n="01" title="Who we are">
        <LegalP>
          Kin Technologies LLC is the operator of Kin, an SMS-based AI assistant
          that helps co-parents coordinate their family schedules. We are an
          Ohio limited liability company and operate the service at
          kinai.family. If you have any questions about this Privacy Policy,
          contact us at <LegalEmail address="hello@kinai.family" />.
        </LegalP>
      </LegalSection>

      <LegalSection n="02" title="What information we collect">
        <LegalSubheading>2.1 Information you provide directly</LegalSubheading>
        <LegalP>
          When you join the Kin waitlist or use the Kin service, we collect:
        </LegalP>
        <LegalUL>
          <LegalLI>
            <LegalStrong>Waitlist information:</LegalStrong> first and last name,
            email address, and mobile phone number
          </LegalLI>
          <LegalLI>
            <LegalStrong>SMS consent record:</LegalStrong> the date, time, and
            IP address at which you checked the SMS consent box on the waitlist
            form
          </LegalLI>
          <LegalLI>
            <LegalStrong>Account information:</LegalStrong> if your account is
            activated, the phone number used to identify you and one-time
            verification codes (OTPs) sent by SMS
          </LegalLI>
          <LegalLI>
            <LegalStrong>Household profile:</LegalStrong> your name, your
            co-parent&apos;s name and phone number (if you invite them), and the
            structure of your household
          </LegalLI>
          <LegalLI>
            <LegalStrong>Children&apos;s information:</LegalStrong> first names,
            ages, and schedule details (school, daycare, activities, custody
            schedules) that you provide
          </LegalLI>
          <LegalLI>
            <LegalStrong>Conversation content:</LegalStrong> the SMS messages
            you send to and receive from Kin
          </LegalLI>
          <LegalLI>
            <LegalStrong>Calendar data:</LegalStrong> if you connect a Google
            Calendar, we request read-only access and only read events on the
            calendars you authorize — Kin never writes to or modifies your
            calendar
          </LegalLI>
          <LegalLI>
            <LegalStrong>Support communications:</LegalStrong> messages you send
            to hello@kinai.family
          </LegalLI>
        </LegalUL>

        <LegalSubheading>2.2 Information collected automatically</LegalSubheading>
        <LegalUL>
          <LegalLI>
            Log data: IP address, user agent, request timestamps, and pages
            viewed on kinai.family
          </LegalLI>
          <LegalLI>
            SMS metadata: message status, delivery timestamps, and carrier
            information returned by our SMS provider
          </LegalLI>
          <LegalLI>
            Usage data: which features you use and general interaction patterns
          </LegalLI>
          <LegalLI>
            Error and performance data needed to keep the service running
          </LegalLI>
        </LegalUL>
        <LegalP>
          We do not run advertising on Kin and do not use tracking cookies for
          advertising purposes.
        </LegalP>

        <LegalSubheading>2.3 Information we do not collect</LegalSubheading>
        <LegalUL>
          <LegalLI>
            Payment card numbers, bank account credentials, or financial
            transaction data (Kin is currently free during the waitlist phase
            and does not process payments)
          </LegalLI>
          <LegalLI>Social Security numbers or government ID numbers</LegalLI>
          <LegalLI>Biometric data</LegalLI>
          <LegalLI>Personal information collected directly from children</LegalLI>
          <LegalLI>Precise device location data</LegalLI>
        </LegalUL>
      </LegalSection>

      <LegalSection n="03" title="How we use your information">
        <LegalUL>
          <LegalLI>
            Send the daily 6:00 AM (local time) family schedule briefing by SMS
          </LegalLI>
          <LegalLI>
            Power Kin&apos;s conversational SMS replies using the Anthropic
            Claude API
          </LegalLI>
          <LegalLI>
            Send partner invitations and one-time verification codes (OTPs) by
            SMS
          </LegalLI>
          <LegalLI>
            Read events from the Google Calendars you connect
          </LegalLI>
          <LegalLI>
            Send service-related communications about your account, the
            waitlist, or the SMS program
          </LegalLI>
          <LegalLI>Respond to support requests</LegalLI>
          <LegalLI>Detect and prevent fraud, abuse, and security incidents</LegalLI>
          <LegalLI>Comply with legal obligations</LegalLI>
        </LegalUL>
        <LegalP>
          <LegalStrong>
            We do not sell or rent your personal information. We do not use
            your information for advertising. We do not share your phone number
            with third parties for their own marketing, and we do not share
            mobile opt-in information with third parties or affiliates for
            marketing or promotional purposes.
          </LegalStrong>
        </LegalP>
      </LegalSection>

      <LegalSection n="04" title="SMS messaging program">
        <LegalP>
          Kin is an SMS-based service. By checking the SMS consent box on the
          waitlist form at kinai.family, you expressly consent to receive
          recurring text messages from Kin at the mobile number you provided,
          sent using an automatic telephone dialing system or similar
          technology. Consent is not a condition of any purchase.
        </LegalP>
        <LegalP>
          <LegalStrong>Program description.</LegalStrong> The Kin SMS program
          includes:
        </LegalP>
        <LegalUL>
          <LegalLI>
            A daily morning schedule briefing delivered around 6:00 AM in your
            local time zone
          </LegalLI>
          <LegalLI>
            Two-way conversational replies (you can text Kin questions or
            schedule updates and Kin will respond)
          </LegalLI>
          <LegalLI>
            Partner invitation messages and one-time verification codes (OTPs)
          </LegalLI>
          <LegalLI>Account, security, and service notifications</LegalLI>
        </LegalUL>
        <LegalP>
          <LegalStrong>Message frequency:</LegalStrong> approximately 1–3
          messages per day, varying with how actively you use the service.
        </LegalP>
        <LegalP>
          <LegalStrong>Message and data rates may apply.</LegalStrong> Message
          and data rates from your wireless carrier may apply to messages you
          send and receive. Kin does not charge you separately for SMS
          messages, but your carrier&apos;s standard rates and fees apply.
        </LegalP>
        <LegalP>
          <LegalStrong>Opt out and help.</LegalStrong> You can opt out of the
          SMS program at any time by replying <Mono>STOP</Mono> to any Kin
          message. After replying STOP, you will receive one confirmation
          message and no further marketing or briefing messages. Reply{" "}
          <Mono>HELP</Mono> for help, or contact us at{" "}
          <LegalEmail address="hello@kinai.family" />. To re-subscribe after
          opting out, reply <Mono>START</Mono> or sign up again.
        </LegalP>
        <LegalP>
          <LegalStrong>Carriers:</LegalStrong> supported by major U.S. carriers.
          Carriers are not liable for delayed or undelivered messages. SMS
          messages are delivered via our SMS provider, Twilio (see Section 7).
        </LegalP>
      </LegalSection>

      <LegalSection n="05" title="Dual-parent privacy architecture">
        <LegalCallout tone="sage" title="Private parent threads">
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
            <li>
              Each parent&apos;s SMS conversation thread with Kin is private to
              that parent and is not visible to the other parent
            </li>
            <li>
              Kin will not disclose the contents of one parent&apos;s thread to
              the other parent, even if directly asked
            </li>
            <li>
              Personal context one parent shares with Kin is not surfaced to
              the other parent&apos;s thread without that parent&apos;s explicit
              instruction
            </li>
          </ul>
        </LegalCallout>

        <LegalCallout tone="amber" title="Shared household data">
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
            <li>The merged family calendar (events from each connected calendar)</li>
            <li>Children&apos;s names, ages, and schedule details</li>
            <li>The daily morning briefing each parent receives</li>
          </ul>
        </LegalCallout>
      </LegalSection>

      <LegalSection n="06" title="Children's privacy (COPPA)">
        <LegalP>
          Kin is intended for use by parents and other adult household members.
          The service is not directed to children, and we do not knowingly
          allow children under 13 to use Kin or collect personal information
          directly from children under 13.
        </LegalP>
        <LegalP>
          Information about your children (such as first names, ages, and
          schedule details) is provided to us by you, the parent, in your role
          as the account holder. You can review, update, or delete this
          information at any time by texting Kin or emailing{" "}
          <LegalEmail address="hello@kinai.family" />.
        </LegalP>
      </LegalSection>

      <LegalSection n="07" title="Third-party services">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 10,
            margin: "8px 0 4px",
          }}
        >
          {[
            {
              name: "Anthropic (Claude API)",
              desc: "Kin's AI replies are generated by Anthropic's Claude API. The relevant family context, calendar data, and your SMS messages are sent to Anthropic to generate responses. Anthropic does not train its models on data submitted through its API.",
            },
            {
              name: "Twilio",
              desc: "SMS messages are delivered to and from your phone by Twilio, our SMS provider. Twilio receives your phone number and message content to route messages and returns delivery metadata to us.",
            },
            {
              name: "Supabase",
              desc: "Your account information, household profile, conversation history, and operational data are stored in Supabase, our database and authentication provider, with infrastructure located in the United States. Data is encrypted at rest and in transit.",
            },
            {
              name: "Google",
              desc: "If you connect Google Calendar, we use Google's OAuth flow to obtain read-only access to the calendars you authorize. Our use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.",
            },
            {
              name: "Vercel",
              desc: "The kinai.family website and Kin's server-side code are hosted on Vercel. Vercel processes request logs and basic operational telemetry on our behalf.",
            },
          ].map((s) => (
            <div
              key={s.name}
              style={{
                padding: "14px 16px",
                background: T.bgCard,
                border: `0.5px solid ${T.hair}`,
                borderRadius: 8,
                boxShadow: "0 1px 2px rgba(60,74,51,0.04)",
              }}
            >
              <div
                style={{
                  fontFamily: T.mono,
                  fontSize: 11,
                  color: T.sage,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                {s.name}
              </div>
              <div style={{ color: T.warm72, fontSize: 13.5, lineHeight: 1.6 }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>
        <LegalP>
          We may also disclose information when required by law, to enforce our
          Terms, or to protect the rights, property, or safety of Kin, our
          users, or others.
        </LegalP>
      </LegalSection>

      <LegalSection n="08" title="Data retention and deletion">
        <LegalP>
          We retain your information for as long as you have an active account
          or are on the waitlist, and for a reasonable period afterward to
          comply with our legal obligations, resolve disputes, and enforce our
          agreements. Records of SMS consent and opt-out requests are retained
          as required by applicable law.
        </LegalP>
        <LegalP>
          You may request deletion of your waitlist entry, account, or other
          personal information at any time by emailing{" "}
          <LegalEmail address="hello@kinai.family" /> from the address on file
          or by replying STOP to opt out of SMS. We will honor verified
          deletion requests within 30 days, subject to limited exceptions for
          legal, security, or fraud-prevention purposes.
        </LegalP>
      </LegalSection>

      <LegalSection n="09" title="Data security">
        <LegalUL>
          <LegalLI>All data is encrypted in transit using TLS</LegalLI>
          <LegalLI>Data stored in Supabase is encrypted at rest</LegalLI>
          <LegalLI>
            Authentication is handled via SMS one-time codes; we do not store
            user passwords
          </LegalLI>
          <LegalLI>
            Access to production data is limited to essential personnel
          </LegalLI>
          <LegalLI>
            We perform regular reviews of our infrastructure and third-party
            processors
          </LegalLI>
        </LegalUL>
        <LegalP>
          No system can be guaranteed perfectly secure. You are responsible for
          keeping access to your phone, email, and connected Google account
          secure.
        </LegalP>
      </LegalSection>

      <LegalSection n="10" title="Your rights">
        <LegalUL>
          <LegalLI>
            <LegalStrong>Access:</LegalStrong> Request a copy of the personal
            information we hold about you
          </LegalLI>
          <LegalLI>
            <LegalStrong>Correction:</LegalStrong> Ask us to correct inaccurate
            or incomplete information
          </LegalLI>
          <LegalLI>
            <LegalStrong>Deletion:</LegalStrong> Request deletion of your
            information as described in Section 8
          </LegalLI>
          <LegalLI>
            <LegalStrong>Portability:</LegalStrong> Request an export of your
            data in a machine-readable format
          </LegalLI>
          <LegalLI>
            <LegalStrong>Opt out of SMS:</LegalStrong> Reply STOP to any Kin
            message at any time
          </LegalLI>
          <LegalLI>
            <LegalStrong>Disconnect Google Calendar:</LegalStrong> Revoke
            Kin&apos;s access at any time from your Google Account permissions
            page
          </LegalLI>
        </LegalUL>
        <LegalP>
          Contact us at <LegalEmail address="hello@kinai.family" />. We will
          respond within 30 days.
        </LegalP>
      </LegalSection>

      <LegalSection n="11" title="California privacy rights (CCPA/CPRA)">
        <LegalP>
          If you are a California resident, you have additional rights under
          the California Consumer Privacy Act, as amended by the California
          Privacy Rights Act: the right to know what personal information we
          collect, use, and disclose; the right to correct inaccurate personal
          information; the right to delete your personal information; the right
          to opt out of the sale or sharing of personal information; the right
          to limit the use of sensitive personal information; and the right not
          to be discriminated against for exercising these rights.
        </LegalP>
        <LegalP>
          We do not sell or share personal information for cross-context
          behavioral advertising as those terms are defined under the
          CCPA/CPRA. To exercise your rights, contact{" "}
          <LegalEmail address="hello@kinai.family" />. We will verify your
          request using the email address or phone number on file.
        </LegalP>
      </LegalSection>

      <LegalSection n="12" title="Changes to this policy">
        <LegalP>
          We may update this Privacy Policy from time to time. If we make
          material changes, we will notify you by email or SMS, and update the
          &ldquo;Last updated&rdquo; date above. Your continued use of Kin
          after the effective date constitutes acceptance of the updated
          policy.
        </LegalP>
      </LegalSection>

      <LegalSection n="13" title="Contact us">
        <LegalP>Kin Technologies LLC</LegalP>
        <LegalP>
          Email: <LegalEmail address="hello@kinai.family" />
        </LegalP>
        <LegalP>Website: kinai.family</LegalP>
      </LegalSection>
    </LegalShell>
  );
}
