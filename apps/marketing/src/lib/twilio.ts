/**
 * Minimal Twilio SMS sender for the marketing app — plain fetch, no SDK.
 *
 * Sends through the A2P 10DLC Messaging Service when
 * TWILIO_MESSAGING_SERVICE_SID is set (best US carrier deliverability);
 * otherwise falls back to the bare TWILIO_PHONE_NUMBER long code.
 *
 * Retries up to 3 attempts with exponential backoff (1s, 2s). Network errors
 * and transient HTTP failures (429, 5xx) are retried; permanent 4xx failures
 * fail fast since a retry can never succeed.
 */

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// A transient failure can succeed on retry; a permanent one (e.g. 21211
// invalid number) never will, so we fail fast rather than burn three attempts.
function isRetryable(status?: number): boolean {
  if (status === undefined) return true; // network / fetch error
  return status === 429 || status >= 500;
}

export async function sendSms(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN are not set");
  }

  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!messagingServiceSid && !fromNumber) {
    throw new Error(
      "Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER to send SMS"
    );
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({ To: to, Body: body });
  if (messagingServiceSid) form.set("MessagingServiceSid", messagingServiceSid);
  else form.set("From", fromNumber as string);

  const authHeader = `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });
      if (res.ok) return;
      const errText = await res.text();
      const e = new Error(
        `Twilio send failed (${res.status}): ${errText}`
      ) as Error & { status?: number };
      e.status = res.status;
      throw e;
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      if (!isRetryable(status) || attempt === 3) break;
      await sleep(1000 * 2 ** (attempt - 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
