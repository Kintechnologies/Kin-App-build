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
        <p className="text-warm-white/40 text-sm mb-8">Last updated: May 2026</p>

        <p className="text-warm-white/60 text-sm italic mb-8 bg-surface-raised rounded-2xl p-4 border border-warm-white/5">
          This Privacy Policy explains how Kin Technologies LLC (&quot;Kin,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) collects, uses, stores, and protects information when you join the Kin waitlist, use Kin&apos;s SMS service, or visit the kinai.family website. Kin is currently available only to residents of the United States who are 18 or older. Please read this policy carefully. By joining the waitlist or using Kin, you agree to the practices described here.
        </p>

        <div className="space-y-8 text-warm-white/70 text-sm leading-relaxed">
          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">1. Who We Are</h2>
            <p>
              Kin Technologies LLC is the operator of Kin, an SMS-based AI assistant that helps co-parents coordinate their family schedules. We are an Ohio limited liability company and operate the service at kinai.family. If you have any questions about this Privacy Policy, contact us at hello@kinai.family.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">2. What Information We Collect</h2>

            <h3 className="text-primary text-sm font-semibold mb-2">2.1 Information You Provide Directly</h3>
            <p className="mb-3">When you join the Kin waitlist or use the Kin service, we collect:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60 mb-4">
              <li><strong className="text-warm-white/70">Waitlist information:</strong> first and last name, email address, and mobile phone number</li>
              <li><strong className="text-warm-white/70">SMS consent record:</strong> the date, time, and IP address at which you checked the SMS consent box on the waitlist form</li>
              <li><strong className="text-warm-white/70">Account information:</strong> if your account is activated, the phone number used to identify you and one-time verification codes (OTPs) sent by SMS</li>
              <li><strong className="text-warm-white/70">Household profile:</strong> your name, your co-parent&apos;s name and phone number (if you invite them), and the structure of your household</li>
              <li><strong className="text-warm-white/70">Children&apos;s information:</strong> first names, ages, and schedule details (school, daycare, activities, custody schedules) that you provide</li>
              <li><strong className="text-warm-white/70">Conversation content:</strong> the SMS messages you send to and receive from Kin</li>
              <li><strong className="text-warm-white/70">Calendar data:</strong> if you connect a Google Calendar, we read events on the calendars you authorize and may write events you ask Kin to add</li>
              <li><strong className="text-warm-white/70">Support communications:</strong> messages you send to hello@kinai.family</li>
            </ul>

            <h3 className="text-primary text-sm font-semibold mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60 mb-4">
              <li>Log data: IP address, user agent, request timestamps, and pages viewed on kinai.family</li>
              <li>SMS metadata: message status, delivery timestamps, and carrier information returned by our SMS provider</li>
              <li>Usage data: which features you use and general interaction patterns</li>
              <li>Error and performance data needed to keep the service running</li>
            </ul>
            <p className="mb-4">We do not run advertising on Kin and do not use tracking cookies for advertising purposes.</p>

            <h3 className="text-primary text-sm font-semibold mb-2">2.3 Information We Do Not Collect</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60">
              <li>Payment card numbers, bank account credentials, or financial transaction data (Kin is currently free during the waitlist phase and does not process payments)</li>
              <li>Social Security numbers or government ID numbers</li>
              <li>Biometric data</li>
              <li>Personal information collected directly from children</li>
              <li>Precise device location data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60 mb-3">
              <li>Send the daily 6:00 AM (local time) family schedule briefing by SMS</li>
              <li>Power Kin&apos;s conversational SMS replies using the Anthropic Claude API</li>
              <li>Send partner invitations and one-time verification codes (OTPs) by SMS</li>
              <li>Read events from, and write events to, the Google Calendars you connect</li>
              <li>Send service-related communications about your account, the waitlist, or the SMS program</li>
              <li>Respond to support requests</li>
              <li>Detect and prevent fraud, abuse, and security incidents</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="font-semibold text-warm-white/80">We do not sell or rent your personal information. We do not use your information for advertising. We do not share your phone number with third parties for their own marketing, and we do not share mobile opt-in information with third parties or affiliates for marketing or promotional purposes.</p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">4. SMS Messaging Program</h2>
            <p className="mb-3">
              Kin is an SMS-based service. By checking the SMS consent box on the waitlist form at kinai.family, you expressly consent to receive recurring text messages from Kin at the mobile number you provided, sent using an automatic telephone dialing system or similar technology. Consent is not a condition of any purchase.
            </p>
            <p className="mb-3"><strong className="text-warm-white/80">Program description.</strong> The Kin SMS program includes:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60 mb-3">
              <li>A daily morning schedule briefing delivered around 6:00 AM in your local time zone</li>
              <li>Two-way conversational replies (you can text Kin questions or schedule updates and Kin will respond)</li>
              <li>Partner invitation messages and one-time verification codes (OTPs)</li>
              <li>Account, security, and service notifications</li>
            </ul>
            <p className="mb-3">
              <strong className="text-warm-white/80">Message frequency:</strong> approximately 1&ndash;3 messages per day, varying with how actively you use the service.
            </p>
            <p className="mb-3">
              <strong className="text-warm-white/80">Message and data rates may apply.</strong> Message and data rates from your wireless carrier may apply to messages you send and receive. Kin does not charge you separately for SMS messages, but your carrier&apos;s standard rates and fees apply.
            </p>
            <p className="mb-3">
              <strong className="text-warm-white/80">Opt out and help.</strong> You can opt out of the SMS program at any time by replying <span className="font-mono text-warm-white/80">STOP</span> to any Kin message. After replying STOP, you will receive one confirmation message and no further marketing or briefing messages. Reply <span className="font-mono text-warm-white/80">HELP</span> for help, or contact us at hello@kinai.family. To re-subscribe after opting out, reply <span className="font-mono text-warm-white/80">START</span> or sign up again.
            </p>
            <p>
              <strong className="text-warm-white/80">Carriers:</strong> supported by major U.S. carriers. Carriers are not liable for delayed or undelivered messages. SMS messages are delivered via our SMS provider, Twilio (see Section 7).
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">5. Dual-Parent Privacy Architecture</h2>

            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4">
              <h3 className="text-primary text-sm font-semibold mb-2">Private Parent Threads</h3>
              <ul className="list-disc pl-5 space-y-1 text-warm-white/60 text-xs">
                <li>Each parent&apos;s SMS conversation thread with Kin is private to that parent and is not visible to the other parent</li>
                <li>Kin will not disclose the contents of one parent&apos;s thread to the other parent, even if directly asked</li>
                <li>Personal context one parent shares with Kin is not surfaced to the other parent&apos;s thread without that parent&apos;s explicit instruction</li>
              </ul>
            </div>

            <div className="bg-amber/10 border border-amber/20 rounded-2xl p-4">
              <h3 className="text-amber text-sm font-semibold mb-2">Shared Household Data</h3>
              <ul className="list-disc pl-5 space-y-1 text-warm-white/60 text-xs">
                <li>The merged family calendar (events from each connected calendar)</li>
                <li>Children&apos;s names, ages, and schedule details</li>
                <li>The daily morning briefing each parent receives</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">6. Children&apos;s Privacy (COPPA)</h2>
            <p className="mb-3">
              Kin is intended for use by parents and other adult household members. The service is not directed to children, and we do not knowingly allow children under 13 to use Kin or collect personal information directly from children under 13.
            </p>
            <p>
              Information about your children (such as first names, ages, and schedule details) is provided to us by you, the parent, in your role as the account holder. You can review, update, or delete this information at any time by texting Kin or emailing hello@kinai.family.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">7. Third-Party Services</h2>
            <div className="space-y-3">
              {[
                { name: "Anthropic (Claude API)", desc: "Kin's AI replies are generated by Anthropic's Claude API. The relevant family context, calendar data, and your SMS messages are sent to Anthropic to generate responses. Anthropic does not train its models on data submitted through its API." },
                { name: "Twilio", desc: "SMS messages are delivered to and from your phone by Twilio, our SMS provider. Twilio receives your phone number and message content to route messages and returns delivery metadata to us." },
                { name: "Supabase", desc: "Your account information, household profile, conversation history, and operational data are stored in Supabase, our database and authentication provider, with infrastructure located in the United States. Data is encrypted at rest and in transit." },
                { name: "Google", desc: "If you connect Google Calendar, we use Google's OAuth flow to obtain read and write access to the calendars you authorize. Our use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements." },
                { name: "Vercel", desc: "The kinai.family website and Kin's server-side code are hosted on Vercel. Vercel processes request logs and basic operational telemetry on our behalf." },
              ].map((s) => (
                <div key={s.name} className="bg-surface-raised rounded-xl p-3">
                  <p className="text-warm-white/80 text-xs font-semibold mb-1">{s.name}</p>
                  <p className="text-warm-white/50 text-xs">{s.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-warm-white/50">We may also disclose information when required by law, to enforce our Terms, or to protect the rights, property, or safety of Kin, our users, or others.</p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">8. Data Retention and Deletion</h2>
            <p className="mb-3">
              We retain your information for as long as you have an active account or are on the waitlist, and for a reasonable period afterward to comply with our legal obligations, resolve disputes, and enforce our agreements. Records of SMS consent and opt-out requests are retained as required by applicable law.
            </p>
            <p>
              You may request deletion of your waitlist entry, account, or other personal information at any time by emailing hello@kinai.family from the address on file or by replying STOP to opt out of SMS. We will honor verified deletion requests within 30 days, subject to limited exceptions for legal, security, or fraud-prevention purposes.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">9. Data Security</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60">
              <li>All data is encrypted in transit using TLS</li>
              <li>Data stored in Supabase is encrypted at rest</li>
              <li>Authentication is handled via SMS one-time codes; we do not store user passwords</li>
              <li>Access to production data is limited to essential personnel</li>
              <li>We perform regular reviews of our infrastructure and third-party processors</li>
            </ul>
            <p className="mt-3 text-xs text-warm-white/50">No system can be guaranteed perfectly secure. You are responsible for keeping access to your phone, email, and connected Google account secure.</p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">10. Your Rights</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-warm-white/60">
              <li><strong className="text-warm-white/70">Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong className="text-warm-white/70">Correction:</strong> Ask us to correct inaccurate or incomplete information</li>
              <li><strong className="text-warm-white/70">Deletion:</strong> Request deletion of your information as described in Section 8</li>
              <li><strong className="text-warm-white/70">Portability:</strong> Request an export of your data in a machine-readable format</li>
              <li><strong className="text-warm-white/70">Opt out of SMS:</strong> Reply STOP to any Kin message at any time</li>
              <li><strong className="text-warm-white/70">Disconnect Google Calendar:</strong> Revoke Kin&apos;s access at any time from your Google Account permissions page</li>
            </ul>
            <p className="mt-3">Contact us at hello@kinai.family. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">11. California Privacy Rights (CCPA/CPRA)</h2>
            <p className="mb-3">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act, as amended by the California Privacy Rights Act: the right to know what personal information we collect, use, and disclose; the right to correct inaccurate personal information; the right to delete your personal information; the right to opt out of the sale or sharing of personal information; the right to limit the use of sensitive personal information; and the right not to be discriminated against for exercising these rights.
            </p>
            <p>
              We do not sell or share personal information for cross-context behavioral advertising as those terms are defined under the CCPA/CPRA. To exercise your rights, contact hello@kinai.family. We will verify your request using the email address or phone number on file.
            </p>
          </section>

          <section>
            <h2 className="text-warm-white font-semibold text-base mb-3">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. If we make material changes, we will notify you by email or SMS, and update the &quot;Last updated&quot; date above. Your continued use of Kin after the effective date constitutes acceptance of the updated policy.
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
        </div>
      </div>
    </main>
  );
}
