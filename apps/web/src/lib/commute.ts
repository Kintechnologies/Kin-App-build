/**
 * Commute intelligence via Google Maps Distance Matrix API (v1.0 — static estimates)
 * Used in the morning briefing to calculate "Leave by X:XX" for the first calendar event.
 */

type TravelMode = "driving" | "transit" | "walking" | "bicycling";

function commuteModeToDrivingMode(mode: string | null | undefined): TravelMode {
  switch (mode) {
    case "transit":
      return "transit";
    case "walk":
      return "walking";
    case "bike":
      return "bicycling";
    case "remote":
      return "driving"; // fallback — won't be used if no work_location
    default:
      return "driving";
  }
}

interface CommuteResult {
  durationSeconds: number;
  durationText: string;
  distanceText: string;
}

/**
 * Fetches travel time from origin to destination using Google Maps Distance Matrix API.
 * Returns null if the API key is missing or the request fails.
 */
export async function fetchCommuteDuration(
  origin: string,
  destination: string,
  mode: string | null | undefined
): Promise<CommuteResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  if (!origin || !destination) return null;

  const travelMode = commuteModeToDrivingMode(mode);

  try {
    const params = new URLSearchParams({
      origins: origin,
      destinations: destination,
      mode: travelMode,
      key: apiKey,
    });

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();

    const element = data?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== "OK") return null;

    return {
      durationSeconds: element.duration.value as number,
      durationText: element.duration.text as string,
      distanceText: element.distance.text as string,
    };
  } catch {
    return null;
  }
}

/**
 * Given the first calendar event's start time and commute duration, calculate the leave-by time.
 * Adds a 5-minute buffer before the commute.
 * Returns a formatted time string like "7:45 AM", or null if calculation is not possible.
 */
export function calculateLeaveByTime(
  eventStartIso: string,
  durationSeconds: number,
  bufferMinutes = 5
): string | null {
  try {
    const eventStart = new Date(eventStartIso);
    if (isNaN(eventStart.getTime())) return null;

    const leaveByMs =
      eventStart.getTime() -
      (durationSeconds + bufferMinutes * 60) * 1000;

    const leaveBy = new Date(leaveByMs);

    return leaveBy.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return null;
  }
}

/**
 * Full commute intelligence entry point.
 * Given a schedule and an ordered list of today's events, returns a human-readable
 * leave-by line for the briefing, e.g.:
 *   "Leave by 7:45 AM — 22 min drive to your 8:30 AM standup."
 * Returns null if commute data can't be calculated.
 */
export async function buildCommuteLine(
  homeLocation: string | null | undefined,
  workLocation: string | null | undefined,
  commuteMode: string | null | undefined,
  todayEvents: Array<{ start_time: string; title: string; location?: string }>
): Promise<string | null> {
  if (!homeLocation || !workLocation) return null;
  if (!todayEvents || todayEvents.length === 0) return null;

  // Use the first event of the day as the target
  const firstEvent = todayEvents[0];

  const result = await fetchCommuteDuration(homeLocation, workLocation, commuteMode);
  if (!result) return null;

  const leaveBy = calculateLeaveByTime(firstEvent.start_time, result.durationSeconds);
  if (!leaveBy) return null;

  const eventTime = new Date(firstEvent.start_time).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const modeLabel = commuteMode === "transit"
    ? "transit"
    : commuteMode === "walk"
    ? "walk"
    : commuteMode === "bike"
    ? "bike"
    : "drive";

  return `Leave by ${leaveBy} — ${result.durationText} ${modeLabel} to your ${eventTime} ${firstEvent.title}.`;
}
