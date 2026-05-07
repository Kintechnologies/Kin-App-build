import Link from "next/link";
import KinWordmark from "@/components/KinWordmark";

export default function TermsPage() {
  return (
    <main className="min-h-screen px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <Link href="/" style={{ textDecoration: "none", marginBottom: 32, display: "inline-block" }}>
          <KinWordmark size={20} tone="warm" />
        </Link>

        <h1 className="text-3xl font-medium text-warm-white mb-2" style={{ letterSpacing: "-0.025em" }}>Terms of Service</h1>
        <p className="text-warm-white/40 text-sm mb-2">Kin Technologies LLC</p>
        <p className="text-warm-white/40 text-sm mb-8">Last updated: May 2026</p>

        <p className="text-warm-white/60 text-sm italic mb-8 bg-surface-raised rounded-2xl p-4 border border-warm-white/5">
          These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you and Kin Technologies LLC governing your use of the Kin SMS service and the kinai.family website. By joining the Kin waitlist, providing your phone number, checking the SMS consent box, or otherwise using Kin, you agree to these Terms. If you do not agree, do not use the service.
        </p>

        <div className="space-y-8 text-warm-white/70 text-sm leading-relaxed">
          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">1. The Service</h2>
            <p className="mb-3">
              Kin Technologies LLC operates Kin, an SMS-based AI assistant that helps co-parents coordinate their family schedules. The current service consists of a daily morning schedule briefing delivered by text message, two-way conversational SMS replies powered by AI, partner invitations, one-time verification codes, and an optional Google Calendar integration.
            </p>
            <p>
              Kin is a software service. It is not a healthcare provider, child-care provider, legal advisor, or family counselor. Nothing Kin sends you is professional medical, legal, psychological, or other expert advice. Kin should not be relied on for emergencies or time-critical safety decisions.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">2. Eligibility</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60">
              <li>You must be at least 18 years old</li>
              <li>You must be a resident of the United States</li>
              <li>You must have the legal capacity to enter into a binding agreement</li>
              <li>You must own or be the authorized user of the mobile phone number you provide</li>
              <li>You must not be prohibited from using the Service under applicable law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">3. Waitlist and Accounts</h2>
            <p className="mb-3">
              Kin is currently in a pre-launch waitlist phase. Joining the waitlist requires submitting your name, email, and mobile phone number, and checking the SMS consent box on kinai.family. Submitting waitlist information does not guarantee access to the service.
            </p>
            <p className="mb-3">
              If your account is activated, you will be identified by your phone number and will authenticate using one-time SMS codes. You are responsible for maintaining control of the phone number and email address associated with your account, and for all activity that occurs through them. Notify us at hello@kinai.family immediately if you believe your account or phone number has been compromised.
            </p>
            <p>
              Kin lets you invite a co-parent to your household by SMS. By inviting another person, you represent that you have their consent to receive an invitation text from Kin at the number you provide and to share household-level information with them as described in our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">4. SMS Program and TCPA Consent</h2>
            <p className="mb-3">
              Kin is delivered primarily by SMS. By joining the waitlist or otherwise providing your mobile number to Kin and checking the SMS consent box, you expressly consent under the Telephone Consumer Protection Act (TCPA) and applicable state law to receive recurring text messages from Kin at that number, sent using an automatic telephone dialing system or similar technology. The consent language you agree to on the waitlist form is:
            </p>
            <blockquote className="border-l-2 border-primary/40 pl-4 italic text-warm-white/60 text-xs mb-3">
              &quot;I agree to receive SMS messages from Kin, including daily coordination briefings and account updates. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe. Reply HELP for help.&quot;
            </blockquote>
            <p className="mb-3">
              <strong className="text-warm-white/80">Consent is not required as a condition of any purchase.</strong> The Kin SMS program includes the daily morning briefing, two-way conversational replies, partner invitations, one-time verification codes, and account or service notifications. Message frequency is approximately 1&ndash;3 messages per day and varies with your usage.
            </p>
            <p className="mb-3">
              <strong className="text-warm-white/80">Message and data rates may apply.</strong> Standard messaging rates from your wireless carrier apply to all messages you send and receive. Kin does not charge a separate fee for SMS.
            </p>
            <p className="mb-3">
              <strong className="text-warm-white/80">Opting out.</strong> You can opt out at any time by replying <span className="font-mono text-warm-white/80">STOP</span> to any Kin message. After you reply STOP, you will receive one confirmation message and no further marketing or briefing messages. Reply <span className="font-mono text-warm-white/80">HELP</span> for help, or contact hello@kinai.family. Reply <span className="font-mono text-warm-white/80">START</span> to re-subscribe after opting out.
            </p>
            <p>
              Carriers are not liable for delayed or undelivered messages. Kin uses Twilio as its third-party SMS provider; see our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for details.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">5. AI-Generated Content</h2>
            <div className="bg-rose/10 border border-rose/20 rounded-2xl p-4 mb-3">
              <p className="text-warm-white/70 text-xs">
                <strong className="text-rose">Important:</strong> Kin&apos;s replies and briefings are generated by AI (Anthropic&apos;s Claude) and are not reviewed by a human before being sent to you. They may be inaccurate, incomplete, or out of date. Kin&apos;s output is for general coordination convenience only and is not professional medical, legal, psychological, educational, or child-care advice.
              </p>
            </div>
            <p>
              Always verify schedule-critical information (school start times, custody handoffs, appointments) against your own calendar or other authoritative sources before acting on it. Kin is not a substitute for direct communication with your co-parent on important matters.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">6. Google Calendar Integration</h2>
            <p className="mb-3">
              If you choose to connect a Google Calendar, you authorize Kin to read events from, and (with your permission) write events to, the calendars you select. We use Google&apos;s OAuth flow to obtain this access and we comply with the Google API Services User Data Policy, including the Limited Use requirements.
            </p>
            <p>
              You may revoke Kin&apos;s access at any time from your Google Account permissions page. Revoking access will disable calendar-related features but will not by itself delete your Kin account.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">7. Acceptable Use</h2>
            <p className="mb-3">You may use Kin only for personal, family, non-commercial scheduling and coordination. You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60">
              <li>Provide a phone number you do not own or are not authorized to use</li>
              <li>Add another person to your household, or send them an invitation, without their consent</li>
              <li>Use Kin for any commercial, bulk-messaging, lead-generation, or telemarketing purpose</li>
              <li>Attempt to access another user&apos;s account, conversation thread, or household data</li>
              <li>Reverse engineer, decompile, or extract the source code or model behavior of the service</li>
              <li>Use automated tools, scrapers, or scripts to interact with Kin or kinai.family</li>
              <li>Interfere with, overload, or disrupt the service or its supporting infrastructure</li>
              <li>Use Kin to harass, threaten, defame, or abuse any person, or to transmit unlawful content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">8. Privacy</h2>
            <p>
              Your use of Kin is also governed by our{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>,
              which is incorporated into these Terms by reference. The Privacy Policy describes what we collect, how we use it, our SMS program, and the dual-parent privacy architecture under which each parent&apos;s thread with Kin is private from the other.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">9. Disclaimers</h2>
            <p className="uppercase text-warm-white/50 text-xs leading-relaxed">
              The Kin service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied. To the fullest extent permitted by law, Kin Technologies LLC disclaims all warranties, including the implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the service will be uninterrupted, timely, secure, or error-free, that SMS messages will be delivered to you on time or at all, or that AI-generated content will be accurate.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">10. Limitation of Liability</h2>
            <p className="uppercase text-warm-white/50 text-xs leading-relaxed">
              To the fullest extent permitted by applicable law, Kin Technologies LLC and its officers, members, employees, and agents will not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, data, goodwill, or other intangible losses, arising out of or related to your use of the service, even if advised of the possibility of such damages. Our aggregate liability for any claim relating to the service will not exceed one hundred U.S. dollars ($100.00) or the amount you paid us in the twelve months preceding the claim, whichever is greater.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">11. Dispute Resolution</h2>
            <p className="mb-3">
              Before filing any legal claim, contact us at hello@kinai.family and attempt to resolve the dispute informally for at least 30 days.
            </p>
            <p>
              These Terms are governed by the laws of the State of Ohio, without regard to its conflict-of-laws principles. Any legal action that is not subject to informal resolution must be brought in the state or federal courts located in Ohio, and you consent to the personal jurisdiction of those courts. You agree to bring any claim individually, not as part of any class, collective, or representative action.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">12. Termination</h2>
            <p>
              You may stop using Kin and request deletion of your account or waitlist entry at any time by replying STOP to opt out of SMS or by emailing hello@kinai.family. We may suspend or terminate your access to the service at our discretion, including for violations of these Terms, abuse of the service, or to comply with legal obligations. Sections that by their nature should survive termination (including disclaimers, limitation of liability, dispute resolution, and these survival provisions) will survive.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">13. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. If we make material changes, we will notify you by email or SMS and update the &quot;Last updated&quot; date above. Your continued use of Kin after the effective date constitutes acceptance of the updated Terms.
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
        </div>
      </div>
    </main>
  );
}
