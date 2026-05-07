import LegalShell, {
  LegalSection,
  LegalP,
  LegalUL,
  LegalLI,
  LegalStrong,
  LegalCallout,
  LegalInlineLink,
  LegalEmail,
  T,
} from "@/components/LegalShell";

const Mono = ({ children }: { children: React.ReactNode }) => (
  <span style={{ fontFamily: T.mono, color: T.warm, fontSize: "0.92em" }}>
    {children}
  </span>
);

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Terms of Service"
      title="The agreement between you and Kin."
      org="Kin Technologies LLC"
      updated="May 2026"
      intro={
        <>
          These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally
          binding agreement between you and Kin Technologies LLC governing your
          use of the Kin SMS service and the kinai.family website. By joining
          the Kin waitlist, providing your phone number, checking the SMS
          consent box, or otherwise using Kin, you agree to these Terms. If
          you do not agree, do not use the service.
        </>
      }
    >
      <LegalSection n="01" title="The service">
        <LegalP>
          Kin Technologies LLC operates Kin, an SMS-based AI assistant that
          helps co-parents coordinate their family schedules. The current
          service consists of a daily morning schedule briefing delivered by
          text message, two-way conversational SMS replies powered by AI,
          partner invitations, one-time verification codes, and an optional
          Google Calendar integration.
        </LegalP>
        <LegalP>
          Kin is a software service. It is not a healthcare provider,
          child-care provider, legal advisor, or family counselor. Nothing Kin
          sends you is professional medical, legal, psychological, or other
          expert advice. Kin should not be relied on for emergencies or
          time-critical safety decisions.
        </LegalP>
      </LegalSection>

      <LegalSection n="02" title="Eligibility">
        <LegalUL>
          <LegalLI>You must be at least 18 years old</LegalLI>
          <LegalLI>You must be a resident of the United States</LegalLI>
          <LegalLI>
            You must have the legal capacity to enter into a binding agreement
          </LegalLI>
          <LegalLI>
            You must own or be the authorized user of the mobile phone number
            you provide
          </LegalLI>
          <LegalLI>
            You must not be prohibited from using the Service under applicable
            law
          </LegalLI>
        </LegalUL>
      </LegalSection>

      <LegalSection n="03" title="Waitlist and accounts">
        <LegalP>
          Kin is currently in a pre-launch waitlist phase. Joining the waitlist
          requires submitting your name, email, and mobile phone number, and
          checking the SMS consent box on kinai.family. Submitting waitlist
          information does not guarantee access to the service.
        </LegalP>
        <LegalP>
          If your account is activated, you will be identified by your phone
          number and will authenticate using one-time SMS codes. You are
          responsible for maintaining control of the phone number and email
          address associated with your account, and for all activity that
          occurs through them. Notify us at{" "}
          <LegalEmail address="hello@kinai.family" /> immediately if you
          believe your account or phone number has been compromised.
        </LegalP>
        <LegalP>
          Kin lets you invite a co-parent to your household by SMS. By inviting
          another person, you represent that you have their consent to receive
          an invitation text from Kin at the number you provide and to share
          household-level information with them as described in our Privacy
          Policy.
        </LegalP>
      </LegalSection>

      <LegalSection n="04" title="SMS program and TCPA consent">
        <LegalP>
          Kin is delivered primarily by SMS. By joining the waitlist or
          otherwise providing your mobile number to Kin and checking the SMS
          consent box, you expressly consent under the Telephone Consumer
          Protection Act (TCPA) and applicable state law to receive recurring
          text messages from Kin at that number, sent using an automatic
          telephone dialing system or similar technology. The consent language
          you agree to on the waitlist form is:
        </LegalP>
        <blockquote
          style={{
            margin: "8px 0 14px",
            padding: "10px 14px",
            borderLeft: `2px solid ${T.sageBorder}`,
            background: T.sage08,
            color: T.warm72,
            fontStyle: "italic",
            fontSize: 13.5,
            lineHeight: 1.55,
            borderRadius: "0 8px 8px 0",
          }}
        >
          &ldquo;I agree to receive SMS messages from Kin, including daily
          coordination briefings and account updates. Message frequency varies.
          Message and data rates may apply. Reply STOP to unsubscribe. Reply
          HELP for help.&rdquo;
        </blockquote>
        <LegalP>
          <LegalStrong>
            Consent is not required as a condition of any purchase.
          </LegalStrong>{" "}
          The Kin SMS program includes the daily morning briefing, two-way
          conversational replies, partner invitations, one-time verification
          codes, and account or service notifications. Message frequency is
          approximately 1–3 messages per day and varies with your usage.
        </LegalP>
        <LegalP>
          <LegalStrong>Message and data rates may apply.</LegalStrong> Standard
          messaging rates from your wireless carrier apply to all messages you
          send and receive. Kin does not charge a separate fee for SMS.
        </LegalP>
        <LegalP>
          <LegalStrong>Opting out.</LegalStrong> You can opt out at any time by
          replying <Mono>STOP</Mono> to any Kin message. After you reply STOP,
          you will receive one confirmation message and no further marketing or
          briefing messages. Reply <Mono>HELP</Mono> for help, or contact{" "}
          <LegalEmail address="hello@kinai.family" />. Reply <Mono>START</Mono>{" "}
          to re-subscribe after opting out.
        </LegalP>
        <LegalP>
          Carriers are not liable for delayed or undelivered messages. Kin uses
          Twilio as its third-party SMS provider; see our{" "}
          <LegalInlineLink href="/privacy">Privacy Policy</LegalInlineLink> for
          details.
        </LegalP>
      </LegalSection>

      <LegalSection n="05" title="AI-generated content">
        <LegalCallout tone="rose" title="Important">
          Kin&apos;s replies and briefings are generated by AI (Anthropic&apos;s
          Claude) and are not reviewed by a human before being sent to you.
          They may be inaccurate, incomplete, or out of date. Kin&apos;s output
          is for general coordination convenience only and is not professional
          medical, legal, psychological, educational, or child-care advice.
        </LegalCallout>
        <LegalP>
          Always verify schedule-critical information (school start times,
          custody handoffs, appointments) against your own calendar or other
          authoritative sources before acting on it. Kin is not a substitute
          for direct communication with your co-parent on important matters.
        </LegalP>
      </LegalSection>

      <LegalSection n="06" title="Google Calendar integration">
        <LegalP>
          If you choose to connect a Google Calendar, you authorize Kin to read
          events from, and (with your permission) write events to, the
          calendars you select. We use Google&apos;s OAuth flow to obtain this
          access and we comply with the Google API Services User Data Policy,
          including the Limited Use requirements.
        </LegalP>
        <LegalP>
          You may revoke Kin&apos;s access at any time from your Google Account
          permissions page. Revoking access will disable calendar-related
          features but will not by itself delete your Kin account.
        </LegalP>
      </LegalSection>

      <LegalSection n="07" title="Acceptable use">
        <LegalP>
          You may use Kin only for personal, family, non-commercial scheduling
          and coordination. You agree not to:
        </LegalP>
        <LegalUL>
          <LegalLI>
            Provide a phone number you do not own or are not authorized to use
          </LegalLI>
          <LegalLI>
            Add another person to your household, or send them an invitation,
            without their consent
          </LegalLI>
          <LegalLI>
            Use Kin for any commercial, bulk-messaging, lead-generation, or
            telemarketing purpose
          </LegalLI>
          <LegalLI>
            Attempt to access another user&apos;s account, conversation thread,
            or household data
          </LegalLI>
          <LegalLI>
            Reverse engineer, decompile, or extract the source code or model
            behavior of the service
          </LegalLI>
          <LegalLI>
            Use automated tools, scrapers, or scripts to interact with Kin or
            kinai.family
          </LegalLI>
          <LegalLI>
            Interfere with, overload, or disrupt the service or its supporting
            infrastructure
          </LegalLI>
          <LegalLI>
            Use Kin to harass, threaten, defame, or abuse any person, or to
            transmit unlawful content
          </LegalLI>
        </LegalUL>
      </LegalSection>

      <LegalSection n="08" title="Privacy">
        <LegalP>
          Your use of Kin is also governed by our{" "}
          <LegalInlineLink href="/privacy">Privacy Policy</LegalInlineLink>,
          which is incorporated into these Terms by reference. The Privacy
          Policy describes what we collect, how we use it, our SMS program, and
          the dual-parent privacy architecture under which each parent&apos;s
          thread with Kin is private from the other.
        </LegalP>
      </LegalSection>

      <LegalSection n="09" title="Disclaimers">
        <p
          style={{
            margin: "0 0 12px",
            color: T.warm56,
            fontSize: 12.5,
            lineHeight: 1.65,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            fontFamily: T.mono,
          }}
        >
          The Kin service is provided &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo; without warranties of any kind, express or implied.
          To the fullest extent permitted by law, Kin Technologies LLC
          disclaims all warranties, including the implied warranties of
          merchantability, fitness for a particular purpose, and
          non-infringement. We do not warrant that the service will be
          uninterrupted, timely, secure, or error-free, that SMS messages will
          be delivered to you on time or at all, or that AI-generated content
          will be accurate.
        </p>
      </LegalSection>

      <LegalSection n="10" title="Limitation of liability">
        <p
          style={{
            margin: "0 0 12px",
            color: T.warm56,
            fontSize: 12.5,
            lineHeight: 1.65,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            fontFamily: T.mono,
          }}
        >
          To the fullest extent permitted by applicable law, Kin Technologies
          LLC and its officers, members, employees, and agents will not be
          liable for any indirect, incidental, special, consequential,
          exemplary, or punitive damages, or for any loss of profits, data,
          goodwill, or other intangible losses, arising out of or related to
          your use of the service, even if advised of the possibility of such
          damages. Our aggregate liability for any claim relating to the
          service will not exceed one hundred U.S. dollars ($100.00) or the
          amount you paid us in the twelve months preceding the claim,
          whichever is greater.
        </p>
      </LegalSection>

      <LegalSection n="11" title="Dispute resolution">
        <LegalP>
          Before filing any legal claim, contact us at{" "}
          <LegalEmail address="hello@kinai.family" /> and attempt to resolve
          the dispute informally for at least 30 days.
        </LegalP>
        <LegalP>
          These Terms are governed by the laws of the State of Ohio, without
          regard to its conflict-of-laws principles. Any legal action that is
          not subject to informal resolution must be brought in the state or
          federal courts located in Ohio, and you consent to the personal
          jurisdiction of those courts. You agree to bring any claim
          individually, not as part of any class, collective, or representative
          action.
        </LegalP>
      </LegalSection>

      <LegalSection n="12" title="Termination">
        <LegalP>
          You may stop using Kin and request deletion of your account or
          waitlist entry at any time by replying STOP to opt out of SMS or by
          emailing <LegalEmail address="hello@kinai.family" />. We may suspend
          or terminate your access to the service at our discretion, including
          for violations of these Terms, abuse of the service, or to comply
          with legal obligations. Sections that by their nature should survive
          termination (including disclaimers, limitation of liability, dispute
          resolution, and these survival provisions) will survive.
        </LegalP>
      </LegalSection>

      <LegalSection n="13" title="Changes to these terms">
        <LegalP>
          We may update these Terms from time to time. If we make material
          changes, we will notify you by email or SMS and update the
          &ldquo;Last updated&rdquo; date above. Your continued use of Kin
          after the effective date constitutes acceptance of the updated
          Terms.
        </LegalP>
      </LegalSection>

      <LegalSection n="14" title="Contact">
        <LegalP>Kin Technologies LLC</LegalP>
        <LegalP>
          Email: <LegalEmail address="hello@kinai.family" />
        </LegalP>
        <LegalP>Website: kinai.family</LegalP>
      </LegalSection>
    </LegalShell>
  );
}
