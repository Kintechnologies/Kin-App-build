/**
 * Date Night Engine (D8/D9)
 *
 * Daily check logic:
 *   1. Has it been 14+ days since the last date night? (checked via date_nights table)
 *   2. If yes: does the current user have a free evening (6–10 PM clear) in the next 7 days?
 *   3. If yes: what is the dining budget remaining?
 *   4. Output: 2 date night suggestions for the morning briefing.
 */

import { SupabaseClient } from "@supabase/supabase-js";

const DATE_NIGHT_THRESHOLD_DAYS = 14;
const EVENING_START_HOUR = 18; // 6 PM
const EVENING_END_HOUR = 22;   // 10 PM

interface DateNightRow {
  date: string;
}

interface CalendarEventRow {
  start_time: string;
  end_time: string;
}

interface BudgetRow {
  category_name: string;
  remaining: number;
}

/**
 * Returns the number of days since the last date night, or null if no date nights exist.
 */
async function daysSinceLastDateNight(
  supabase: SupabaseClient,
  profileId: string
): Promise<number | null> {
  const { data } = await supabase
    .from("date_nights")
    .select("date")
    .eq("profile_id", profileId)
    .order("date", { ascending: false })
    .limit(1)
    .single<DateNightRow>();

  if (!data) return null; // No date nights on record

  const last = new Date(data.date);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Finds the next free evening (6–10 PM block with no calendar events) within the next 7 days.
 * Returns an ISO date string (YYYY-MM-DD) or null.
 */
async function findNextFreeEvening(
  supabase: SupabaseClient,
  profileId: string
): Promise<string | null> {
  const now = new Date();
  const weekOut = new Date(now);
  weekOut.setDate(weekOut.getDate() + 7);

  // Fetch all calendar events in the next 7 days that overlap with 6–10 PM window
  const { data: events } = await supabase
    .from("calendar_events")
    .select("start_time, end_time")
    .eq("profile_id", profileId)
    .gte("start_time", now.toISOString())
    .lte("start_time", weekOut.toISOString());

  const busyEvenings = new Set<string>();

  if (events) {
    for (const event of events as CalendarEventRow[]) {
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      const dateKey = start.toISOString().split("T")[0];

      // Check if the event overlaps with the 6–10 PM window
      const eveningStart = new Date(start);
      eveningStart.setHours(EVENING_START_HOUR, 0, 0, 0);
      const eveningEnd = new Date(start);
      eveningEnd.setHours(EVENING_END_HOUR, 0, 0, 0);

      if (start < eveningEnd && end > eveningStart) {
        busyEvenings.add(dateKey);
      }
    }
  }

  // Walk through the next 7 days to find the first free evening
  for (let i = 1; i <= 7; i++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + i);
    const dateKey = candidate.toISOString().split("T")[0];

    if (!busyEvenings.has(dateKey)) {
      return dateKey;
    }
  }

  return null; // No free evening found
}

/**
 * Fetches the remaining dining/restaurant budget.
 * Looks for a budget category matching "dining", "restaurants", "eating out", etc.
 * Returns a dollar amount or null.
 */
async function getDiningBudgetRemaining(
  supabase: SupabaseClient,
  profileId: string
): Promise<number | null> {
  const { data } = await supabase.rpc("get_budget_summary", {
    user_id: profileId,
  });

  if (!data) return null;

  // Match dining-related categories (case-insensitive)
  const diningKeywords = ["dining", "restaurant", "eating out", "food", "takeout", "takeaway"];

  const diningCategory = (data as BudgetRow[]).find((row) =>
    diningKeywords.some((kw) =>
      row.category_name.toLowerCase().includes(kw)
    )
  );

  return diningCategory?.remaining ?? null;
}

/**
 * Formats a date string as a friendly day name, e.g. "this Friday" or "Saturday (April 6)".
 */
function formatFreeEvening(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  const today = new Date();
  const diffDays = Math.round(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  if (diffDays === 1) return "tomorrow evening";
  if (diffDays <= 6) return `this ${dayName} evening`;
  return `${dayName}, ${monthDay}`;
}

/**
 * Builds a date night suggestion block for inclusion in the morning briefing.
 * Returns null if no suggestion should be made (< 14 days, no free evening).
 */
export async function buildDateNightSuggestion(
  supabase: SupabaseClient,
  profileId: string
): Promise<string | null> {
  // Check 14-day threshold
  const daysSince = await daysSinceLastDateNight(supabase, profileId);

  // Trigger if: no date nights ever, OR it has been >= 14 days
  const shouldSuggest = daysSince === null || daysSince >= DATE_NIGHT_THRESHOLD_DAYS;
  if (!shouldSuggest) return null;

  // Find a free evening
  const freeEvening = await findNextFreeEvening(supabase, profileId);
  if (!freeEvening) return null;

  // Get dining budget context
  const diningRemaining = await getDiningBudgetRemaining(supabase, profileId);

  const eveningLabel = formatFreeEvening(freeEvening);
  const sinceLine =
    daysSince === null
      ? "No date nights logged yet."
      : `It's been ${daysSince} days since your last date night.`;

  let budgetLine = "";
  if (diningRemaining !== null && diningRemaining > 0) {
    budgetLine = ` You have $${diningRemaining.toFixed(0)} left in dining budget.`;
  } else if (diningRemaining !== null && diningRemaining <= 0) {
    budgetLine = " Dining budget is tapped — a home cook night or a walk counts too.";
  }

  // Two calibrated suggestions
  const suggestions = buildSuggestions(diningRemaining);

  return `DATE NIGHT:
${sinceLine}${budgetLine} You're both free ${eveningLabel}.

Options:
  1. ${suggestions[0]}
  2. ${suggestions[1]}`;
}

/**
 * Returns two date night suggestions calibrated to the dining budget remaining.
 */
function buildSuggestions(budgetRemaining: number | null): [string, string] {
  if (budgetRemaining === null || budgetRemaining >= 80) {
    return [
      "Dinner at a sit-down restaurant — let the reservation handle the night.",
      "Cocktails and small plates at a wine bar or tapas spot.",
    ];
  }

  if (budgetRemaining >= 40) {
    return [
      "Casual dinner out — ramen, tacos, or a neighborhood bistro.",
      "Pick up something special and eat at home — no dishes pressure, full budget control.",
    ];
  }

  // Low or negative budget
  return [
    "Cook together at home — pick one new recipe, make it an event.",
    "Walk to a coffee shop or dessert spot — cheap, still intentional.",
  ];
}
