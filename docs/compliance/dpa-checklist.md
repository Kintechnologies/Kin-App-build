# DPA Checklist

(Audit V7 P2-P5) The privacy policy lists these processors. Each row
tracks the standard DPA link and the status of the signed
counter-signature.

| Processor | Role | Standard DPA | Signed? | Notes |
|---|---|---|---|---|
| Supabase | Database + auth + storage | https://supabase.com/legal/dpa | ☐ TODO | Auto-accepted on org plan upgrade. Re-sign on plan changes. |
| Vercel | Hosting + edge | https://vercel.com/legal/dpa | ☐ TODO | Pro plan includes DPA; verify org-level signature. |
| Google | OAuth (Calendar) | https://workspaceupdates.googleblog.com/ (Workspace customers); for OAuth scopes the user consents directly | n/a | We are not a Google data processor — the user authorizes via OAuth and Google's Privacy Policy applies. |
| Anthropic | LLM inference | https://www.anthropic.com/legal/commercial-terms | ☐ TODO | See `anthropic.md` for the workspace-logging-disabled confirmation. |
| Stripe | Billing | https://stripe.com/legal/dpa | ☐ TODO | Auto-accepted via dashboard. |
| Twilio | SMS delivery | https://www.twilio.com/legal/data-protection-addendum | ☐ TODO | DPA + 10DLC brand-registration evidence both live here. |
| Resend | Transactional email | https://resend.com/legal/dpa | ☐ TODO | Pro plan only. |
| Slack | Ops alerts (no user data sent — `briefing.ts` redacts) | https://slack.com/main-services-agreement | ☐ TODO | We treat Slack as a *system* surface, not a processor of user data, because notify.ts only emits IDs after V6 P0-5. |
| Sentry | Crash reporting | https://sentry.io/legal/dpa | ☐ TODO | `sentry-scrub.ts` strips PII before transmission. |

Re-check at every yearly compliance review or whenever a processor's
plan / pricing tier changes.
