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
const FROM_NUMBER = () => {
  const v = process.env.TWILIO_PHONE_NUMBER;
  if (!v) throw new Error("TWILIO_PHONE_NUMBER is not set");
  return v;
};

/**
 * Send an SMS via the Twilio REST API using fetch (no npm package needed).
 */
export async function sendSms(to: string, body: string): Promise<void> {
  const sid = ACCOUNT_SID();
  const token = AUTH_TOKEN();
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: FROM_NUMBER(), Body: body }).toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio send failed (${res.status}): ${err}`);
  }
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
