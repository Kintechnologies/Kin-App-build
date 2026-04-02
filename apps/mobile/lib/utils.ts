/**
 * Format family name for display.
 * Handles cases where DB stores "Ford", "The Fords", "Fords", etc.
 * Always returns "The Ford Family" format.
 */
export function formatFamilyName(raw: string | null | undefined): string {
  if (!raw) return "Your Family";

  // Strip leading "The " if present
  let name = raw.replace(/^the\s+/i, "").trim();

  // Strip trailing "family" if present
  name = name.replace(/\s+family$/i, "").trim();

  // Strip trailing "'s" or "s" possessive/plural for clean base
  // "Fords" -> "Ford", "Ford's" -> "Ford"
  const baseName = name.replace(/'s$|s$/i, "").trim() || name;

  return `The ${baseName} Family`;
}

/**
 * Get greeting based on time of day
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return "$" + amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
