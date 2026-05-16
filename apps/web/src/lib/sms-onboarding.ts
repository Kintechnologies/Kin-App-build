/**
 * SMS-first onboarding state machine.
 *
 * Onboarding now happens entirely over text. A new texter has their profile
 * created on the first inbound message — their phone number IS the auth, no
 * password or OTP. Kin then walks them through a conversational setup, one
 * question per SMS, tracked by profiles.onboarding_step:
 *
 *   0 = new (profile just created)      5 = awaiting home location
 *   1 = awaiting first name             6 = awaiting partner phone (or skip)
 *   2 = awaiting kids' names + ages     7 = awaiting recurring commitments
 *   3 = awaiting school / daycare       8 = calendar link sent, awaiting reply
 *   4 = awaiting wake time              9 = complete
 *
 * Structured data lands in its proper table (family_members, children_details),
 * and a human-readable copy is also appended to profiles.context_notes so the
 * post-onboarding SMS Q&A bot — whose system prompt only reads context_notes —
 * still knows the family.
 *
 * Every outbound SMS goes through twilio.ts, which sends via the A2P 10DLC
 * Messaging Service.
 */

import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { twimlReply } from "@/lib/twilio";
import { dispatchPartnerInvite } from "@/lib/partner-invite";

type AdminClient = ReturnType<typeof createAdminClient>;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://kinai.family";

/** Profile shape the inbound SMS route and this state machine share. */
export interface OnboardingProfile {
  id: string;
  family_name: string | null;
  household_id: string | null;
  onboarding_step: number;
  onboarding_completed: boolean | null;
  context_notes: string | null;
  partner_phone_pending: string | null;
}

// ─── Static question text ──────────────────────────────────────────────────────

const WELCOME_QUESTION =
  "Hey! I'm Kin — I help families stay coordinated with a daily morning briefing. What's your first name?";

const WAKE_QUESTION =
  "What time do you usually wake up on weekdays? I'll have your briefing ready before then.";

const LOCATION_QUESTION =
  "Where's home? Just a city or zip — I'll pull weather and traffic for your mornings.";

const PARTNER_QUESTION =
  "Do you have a partner or co-parent who helps coordinate? Text me their phone number and I'll invite them. Or reply \"skip\".";

const RECURRING_QUESTION =
  "Any recurring things I should know? Like \"Tuesdays I leave early\" or \"Fridays WFH\". Reply \"nothing\" if not.";

// ─── Profile creation ──────────────────────────────────────────────────────────

/**
 * Create a profile for a brand-new texter. The phone number is the identity:
 * an auth.users row is minted (phone-confirmed, no password), and the
 * handle_new_user() trigger creates the matching profiles row in the same
 * transaction. We then pin phone_number to the exact E.164 Twilio sends so
 * future inbound lookups always match.
 *
 * Returns null if creation fails (e.g. the number already has an auth user) —
 * the caller should reply with a soft error.
 */
export async function createOnboardingProfile(
  supabase: AdminClient,
  fromNumber: string
): Promise<OnboardingProfile | null> {
  const phoneDigits = fromNumber.replace(/[^\d]/g, "");
  if (!phoneDigits) return null;

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    phone: phoneDigits,
    phone_confirm: true,
  });
  if (createErr || !created?.user) {
    console.error("createOnboardingProfile: auth user creation failed:", createErr);
    return null;
  }

  const { data: profile, error: updateErr } = await supabase
    .from("profiles")
    .update({
      phone_number: fromNumber,
      onboarding_step: 0,
      onboarding_completed: false,
    })
    .eq("id", created.user.id)
    .select(
      "id, family_name, household_id, onboarding_step, onboarding_completed, context_notes, partner_phone_pending"
    )
    .single<OnboardingProfile>();

  if (updateErr || !profile) {
    console.error("createOnboardingProfile: profile update failed:", updateErr);
    return null;
  }
  return profile;
}

// ─── State machine ─────────────────────────────────────────────────────────────

/**
 * Advance SMS onboarding by one step: interpret the inbound message as the
 * answer to the current step, persist it, and reply with the next question
 * (or the completion message). Returns TwiML.
 */
export async function handleSmsOnboarding(
  supabase: AdminClient,
  profile: OnboardingProfile,
  fromNumber: string,
  messageBody: string,
  step: number
): Promise<Response> {
  const fromKin = process.env.TWILIO_PHONE_NUMBER ?? "";
  const priorNotes = profile.context_notes ?? "";
  let notes = priorNotes;
  let reply: string;
  let nextStep: number;
  const updates: Record<string, unknown> = {};

  switch (step) {
    case 0: {
      // First inbound text — the message content is just the "hello"; ignore it.
      reply = WELCOME_QUESTION;
      nextStep = 1;
      break;
    }

    case 1: {
      const name = cleanFirstName(messageBody);
      updates.family_name = name;
      reply = `Nice to meet you, ${name}. Tell me about your kids — their names and ages. (Something like "Jaxon is 2 and Maya is 5.")`;
      nextStep = 2;
      break;
    }

    case 2: {
      const kids = await parseKids(messageBody);
      if (kids.length > 0) {
        await insertKids(supabase, profile.id, kids);
        notes = appendNote(
          notes,
          "kids",
          kids.map((k) => (k.age != null ? `${k.name} (${k.age})` : k.name)).join(", ")
        );
        reply = buildSchoolQuestion(kids.map((k) => k.name));
        nextStep = 3;
      } else {
        // No kids parsed — keep the raw answer and skip the school question.
        notes = appendNote(notes, "kids", messageBody);
        reply = WAKE_QUESTION;
        nextStep = 4;
      }
      break;
    }

    case 3: {
      notes = appendNote(notes, "schools", messageBody);
      await applySchools(supabase, profile.id, messageBody);
      reply = WAKE_QUESTION;
      nextStep = 4;
      break;
    }

    case 4: {
      notes = appendNote(notes, "wake_time", messageBody);
      reply = LOCATION_QUESTION;
      nextStep = 5;
      break;
    }

    case 5: {
      notes = appendNote(notes, "home_location", messageBody);
      reply = PARTNER_QUESTION;
      nextStep = 6;
      break;
    }

    case 6: {
      const partnerPhone = extractPhone(messageBody);
      if (partnerPhone) {
        await invitePartner(supabase, profile, partnerPhone);
        notes = appendNote(notes, "partner", `invited ${partnerPhone}`);
      } else {
        notes = appendNote(notes, "partner", "none / solo");
      }
      reply = RECURRING_QUESTION;
      nextStep = 7;
      break;
    }

    case 7: {
      notes = appendNote(notes, "recurring_commitments", messageBody);
      const token = randomBytes(12).toString("hex");
      updates.calendar_connect_token = token;
      reply =
        "Last thing — want me to see your calendar so your briefings are actually useful? " +
        `Connect it here: ${APP_URL}/connect/${token}\n\nOr reply "skip".`;
      nextStep = 8;
      break;
    }

    case 8:
    default: {
      // Step 8: they tapped the calendar link (or replied "skip"). Either way,
      // any inbound message here completes onboarding.
      const firstName = (profile.family_name ?? "").split(/\s+/)[0] || "there";
      reply =
        `You're all set, ${firstName}! Your first briefing arrives tomorrow morning. ` +
        `Just text me anytime — "who has pickup today?", "what's this week look like?" — I've got you.`;
      nextStep = 9;
      updates.onboarding_completed = true;
      // The completion message is the welcome SMS — record it so the web
      // welcome hook never double-texts an SMS-onboarded user.
      updates.welcome_sms_sent_at = new Date().toISOString();
      break;
    }
  }

  updates.onboarding_step = nextStep;
  if (notes !== priorNotes) updates.context_notes = notes;

  await supabase.from("profiles").update(updates).eq("id", profile.id);

  await supabase.from("sms_conversations").insert({
    profile_id: profile.id,
    direction: "outbound",
    body: reply,
    from_number: fromKin,
    to_number: fromNumber,
  });

  return twimlReply(reply);
}

// ─── Answer parsing ────────────────────────────────────────────────────────────

/** Pull a usable first name out of a freeform reply ("hey, I'm Sarah!" → "Sarah"). */
function cleanFirstName(raw: string): string {
  let s = raw
    .trim()
    .replace(/^(hey,?\s*)?(i'?m|it'?s|its|this is|my name is|name'?s|call me)\s+/i, "");
  s = (s.split(/[\s,.!?]+/)[0] ?? "").replace(/[^A-Za-z'-]/g, "");
  if (!s) return "there";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Extract a partner phone number, or null if the reply is a skip/no. */
function extractPhone(raw: string): string | null {
  const trimmed = raw.trim();

  // Explicit international form wins.
  const plus = trimmed.match(/\+\d[\d\s().-]{6,}\d/);
  if (plus) {
    const digits = plus[0].replace(/[^\d]/g, "");
    if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  }

  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** Append a "label: value" line to the accumulated context_notes string. */
function appendNote(existing: string, label: string, value: string): string {
  const line = `${label}: ${value.trim()}`;
  return existing ? `${existing}\n${line}` : line;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function buildSchoolQuestion(names: string[]): string {
  if (names.length === 1) {
    return `Got it. Does ${names[0]} go to daycare or school? Tell me the name of the place.`;
  }
  return `Got it. Do they go to daycare or school? Tell me where each one goes — ${joinNames(names)}.`;
}

/** Find the first JSON array in a model response and parse it; [] on failure. */
function extractJsonArray(text: string): unknown[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Parse children's names + ages from a natural-language reply via Claude. */
export async function parseKids(
  message: string
): Promise<{ name: string; age: number | null }[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await getAnthropicClient()
      .messages.create(
        {
          model: ANTHROPIC_MODEL,
          max_tokens: 400,
          system:
            "You extract children's names and ages from a parent's text message. " +
            'Respond with ONLY a JSON array, e.g. [{"name":"Jaxon","age":2},{"name":"Maya","age":5}]. ' +
            '"age" is an integer in years, or null if not stated. ' +
            "If no children are mentioned, respond with []. Output nothing except the JSON array.",
          messages: [{ role: "user", content: message }],
        },
        { signal: controller.signal }
      )
      .finally(() => clearTimeout(timeout));

    const first = response.content[0];
    if (first?.type !== "text") return [];

    const kids: { name: string; age: number | null }[] = [];
    for (const item of extractJsonArray(first.text)) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const name = String(rec.name ?? "").trim();
      if (!name) continue;
      const age =
        typeof rec.age === "number" && Number.isFinite(rec.age) ? Math.round(rec.age) : null;
      kids.push({ name, age });
    }
    return kids.slice(0, 12);
  } catch (err) {
    console.error("parseKids failed:", err);
    return [];
  }
}

/** Parse which school/daycare each named child attends via Claude. */
async function parseSchools(
  kidNames: string[],
  message: string
): Promise<{ name: string; school: string }[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await getAnthropicClient()
      .messages.create(
        {
          model: ANTHROPIC_MODEL,
          max_tokens: 400,
          system:
            `The children are: ${kidNames.join(", ")}. ` +
            "From the parent's message, extract which school or daycare each child attends. " +
            'Respond with ONLY a JSON array, e.g. [{"name":"Maya","school":"Lincoln Elementary"}]. ' +
            "Only include children whose school or daycare is actually stated. " +
            "Output nothing except the JSON array.",
          messages: [{ role: "user", content: message }],
        },
        { signal: controller.signal }
      )
      .finally(() => clearTimeout(timeout));

    const first = response.content[0];
    if (first?.type !== "text") return [];

    const schools: { name: string; school: string }[] = [];
    for (const item of extractJsonArray(first.text)) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const name = String(rec.name ?? "").trim();
      const school = String(rec.school ?? "").trim();
      if (name && school) schools.push({ name, school });
    }
    return schools;
  } catch (err) {
    console.error("parseSchools failed:", err);
    return [];
  }
}

// ─── Persistence ───────────────────────────────────────────────────────────────

async function insertKids(
  supabase: AdminClient,
  profileId: string,
  kids: { name: string; age: number | null }[]
): Promise<void> {
  try {
    await supabase.from("family_members").insert(
      kids.map((k) => ({
        profile_id: profileId,
        name: k.name,
        age: k.age,
        member_type: "child",
      }))
    );
  } catch (err) {
    console.error("insertKids failed:", err);
  }
}

async function applySchools(
  supabase: AdminClient,
  profileId: string,
  message: string
): Promise<void> {
  try {
    const { data: members } = await supabase
      .from("family_members")
      .select("id, name")
      .eq("profile_id", profileId)
      .eq("member_type", "child");

    if (!members || members.length === 0) return;

    const schools = await parseSchools(
      members.map((m: { name: string }) => m.name),
      message
    );

    for (const s of schools) {
      const match = members.find(
        (m: { name: string }) => m.name.toLowerCase() === s.name.toLowerCase()
      );
      if (!match) continue;
      await supabase.from("children_details").insert({
        family_member_id: match.id,
        profile_id: profileId,
        school_name: s.school,
      });
    }
  } catch (err) {
    console.error("applySchools failed:", err);
  }
}

/**
 * Send the partner invite immediately when a phone number is given. Delegates
 * to the shared dispatcher so the partner gets a real /join/invite/<code> link
 * and lands in THIS household. Best-effort — a failure is logged, not thrown.
 */
async function invitePartner(
  supabase: AdminClient,
  profile: OnboardingProfile,
  partnerPhone: string
): Promise<void> {
  try {
    await dispatchPartnerInvite({
      db: supabase,
      inviterProfileId: profile.id,
      inviterFamilyName: profile.family_name,
      partnerPhone,
    });
  } catch (err) {
    console.error("Partner invite dispatch failed:", err);
  }
}
