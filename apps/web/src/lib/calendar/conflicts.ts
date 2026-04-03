import type { CalendarEvent, CalendarConflict } from "@/types";

interface ConflictCandidate {
  event_a: CalendarEvent;
  event_b: CalendarEvent;
  conflict_type: "time_overlap" | "kid_conflict" | "meal_conflict";
  description: string;
}

// Detect conflicts in a merged household event list
export function detectConflicts(
  events: CalendarEvent[],
  _householdId: string
): ConflictCandidate[] {
  const conflicts: ConflictCandidate[] = [];

  // Only look at non-deleted, non-cancelled events
  const active = events.filter((e) => !e.deleted_at);

  // Sort by start time
  active.sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];

      const aEnd = new Date(a.end_time).getTime();
      const bStart = new Date(b.start_time).getTime();

      // If b starts after a ends, no more overlaps for a
      if (bStart >= aEnd) break;

      // Skip if same owner (personal schedule overlap isn't a household conflict)
      // unless one is a kid event
      const bothParentEvents =
        !a.is_kid_event && !b.is_kid_event;
      const differentOwners = a.owner_parent_id !== b.owner_parent_id;

      // 1. Time overlap between both parents
      if (bothParentEvents && differentOwners && a.is_shared && b.is_shared) {
        conflicts.push({
          event_a: a,
          event_b: b,
          conflict_type: "time_overlap",
          description: `"${a.title}" and "${b.title}" overlap — both parents are booked.`,
        });
      }

      // 2. Kid event conflicts with parent availability
      if (a.is_kid_event && !b.is_kid_event) {
        conflicts.push({
          event_a: a,
          event_b: b,
          conflict_type: "kid_conflict",
          description: `"${a.title}" (${a.assigned_member || "kids"}) conflicts with "${b.title}" — who handles pickup/dropoff?`,
        });
      }
      if (b.is_kid_event && !a.is_kid_event) {
        conflicts.push({
          event_a: b,
          event_b: a,
          conflict_type: "kid_conflict",
          description: `"${b.title}" (${b.assigned_member || "kids"}) conflicts with "${a.title}" — who handles pickup/dropoff?`,
        });
      }
    }
  }

  return conflicts;
}

// Compare new conflicts against existing ones to avoid duplicates
export function findNewConflicts(
  candidates: ConflictCandidate[],
  existingConflicts: CalendarConflict[]
): ConflictCandidate[] {
  return candidates.filter((candidate) => {
    return !existingConflicts.some(
      (existing) =>
        !existing.resolved &&
        ((existing.event_a_id === candidate.event_a.id &&
          existing.event_b_id === candidate.event_b.id) ||
          (existing.event_a_id === candidate.event_b.id &&
            existing.event_b_id === candidate.event_a.id))
    );
  });
}
