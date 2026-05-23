/**
 * Shared formatting helpers used in dashboard UI surfaces.
 *
 * Lifted from `dashboard/family/page.tsx` and `dashboard/settings/page.tsx`
 * (audit V7 P2-D6) where two near-identical copies had drifted: only the
 * settings version handled the `null` case. Single source of truth here.
 */

/**
 * Format a US phone number as `(NNN) NNN-NNNN`. Returns the original raw
 * string when it doesn't parse to 10 digits (e.g. an international or
 * malformed number) and a placeholder when null is passed.
 */
export function formatPhone(
  raw: string | null | undefined,
  fallback = "Not on file"
): string {
  if (!raw) return fallback;
  const digits = raw.replace(/\D/g, "").replace(/^1/, "");
  if (digits.length !== 10) return raw;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * As-you-type formatter for a US phone input. Accepts partial digits and
 * progressively layers parens / space / dash so the input mask matches
 * what the user is typing. Used by the onboarding sms-setup form and the
 * family-invite phone input (audit V7 P2-D2).
 */
export function formatPhoneAsYouType(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}
