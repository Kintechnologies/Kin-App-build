# Compliance Evidence

This directory captures the paperwork our privacy policy commits us to —
Data Processing Agreements (DPAs), sub-processor confirmations, and
per-vendor logging postures. Each file is named by the processor it
covers so legal can trace a `privacy/page.tsx §5` claim back to its
source artifact.

(Audit V7 P2-P5) The privacy policy enumerates 8 third-party processors:
Supabase, Vercel, Google, Anthropic, Stripe, Twilio, Resend, Slack, and
Sentry. Each needs a signed DPA on file (CCPA, GDPR Art. 28). The
processors' standard DPAs are linked from `dpa-checklist.md`; signed
counter-signatures get checked in here as `dpa-<vendor>.pdf` (or
`dpa-<vendor>.md` for vendors whose DPA is accepted by clickwrap).

(Audit V7 P2-P6) Anthropic in particular requires a positive
confirmation that workspace-level logging is *disabled* on the
production API key — otherwise the morning-briefing prompts (which
contain household PII) are retained by Anthropic by default. The
verification record lives in `anthropic.md`.

This directory is intentionally minimal until DPAs are signed; the
README is the placeholder so legal can see the layout we'll fill in.
