import crypto from "crypto";

const ACCOUNT_SID = () => {
  const v = process.env.TWILIO_ACCOUNT_SID;
  if (!v) throw new Error("TWILIO_ACCOUNT_SID is not set");
  return v;
};
const AUTH_TOKEN = () => {
  const v = process.env.TWILIO_AUTH_TOKEN;
  if (!v) throw new Error("TWILIO_AUTH_TOKEN is not set");
  return v;
};
const MESSAGING_SERVICE_SID = () => {
  const v = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!v) throw new Error("TWILIO_MESSAGING_SERVICE_SID is not set");
  return v;
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// A transient failure can succeed on retry; a permanent one (e.g. 21211
// invalid number) never will, so we fail fast rather than burn three attempts.
function isRetryable(status?: number): boolean {
  if (status === undefined) return true; // network / fetch error
  return status === 429 || status >= 500;
}

async function sendSmsOnce(
  to: string,
  body: string,
  sid: string,
  token: string,
  messagingServiceSid: string
): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: to,
      MessagingServiceSid: messagingServiceSid,
      Body: body,
    }).toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    const e = new Error(`Twilio send failed (${res.status}): ${err}`) as Error & {
      status?: number;
    };
    e.status = res.status;
    throw e;
  }
}

/**
 * Send an SMS via the Twilio REST API using fetch (no npm package needed).
 *
 * Sent through the A2P 10DLC Messaging Service rather than a bare From
 * number, so carrier delivery is tied to the registered A2P campaign.
 * Sending from an unregistered long code fails US carrier filtering with
 * error 30034 ("message from an unregistered number").
 *
 * Retries up to 3 attempts with exponential backoff (1s, 2s). Network errors
 * and transient HTTP failures (429, 5xx) are retried; permanent 4xx failures
 * fail fast since a retry can never succeed. The last error is thrown only
 * after all attempts are exhausted.
 */
export async function sendSms(to: string, body: string): Promise<void> {
  const sid = ACCOUNT_SID();
  const token = AUTH_TOKEN();
  const messagingServiceSid = MESSAGING_SERVICE_SID();

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await sendSmsOnce(to, body, sid, token, messagingServiceSid);
      return;
    } catch (err) {
      lastErr = err;
      const status = (err as { status?: number })?.status;
      if (!isRetryable(status) || attempt === 3) break;
      await sleep(1000 * 2 ** (attempt - 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * Validate an inbound Twilio webhook request.
 * Returns true only when the X-Twilio-Signature matches the HMAC-SHA1 of the
 * request URL + sorted POST params signed with TWILIO_AUTH_TOKEN.
 */
export function validateTwilioRequest(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  const token = AUTH_TOKEN();
  const sortedKeys = Object.keys(params).sort();
  let payload = url;
  for (const key of sortedKeys) {
    payload += key + (params[key] ?? "");
  }
  const expected = crypto
    .createHmac("sha1", token)
    .update(payload, "utf8")
    .digest("base64");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

/**
 * Wrap text in minimal TwiML for a single-message reply.
 */
export function twimlReply(message: string): Response {
  const body = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

/**
 * Return an empty 200 TwiML response (no reply sent).
 */
export function twimlEmpty(): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
