import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Chat
  chat: (message: string, imageBase64?: string) =>
    apiRequest<{ response: string }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, image: imageBase64 }),
    }),

  // Meals
  generateMealPlan: (data: Record<string, unknown>) =>
    apiRequest("/api/meals", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getRecipe: (mealName: string) =>
    apiRequest<{ recipe: string }>("/api/recipe", {
      method: "POST",
      body: JSON.stringify({ mealName }),
    }),

  // Calendar
  getEvents: (start?: string, end?: string, view?: string) => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    if (view) params.set("view", view);
    return apiRequest(`/api/calendar/events?${params}`);
  },

  createEvent: (event: Record<string, unknown>) =>
    apiRequest("/api/calendar/events", {
      method: "POST",
      body: JSON.stringify(event),
    }),

  // Sync
  triggerSync: () =>
    apiRequest("/api/calendar/sync", { method: "POST" }),

  getSyncStatus: () =>
    apiRequest("/api/calendar/sync"),

  // Conflicts
  getConflicts: () =>
    apiRequest("/api/calendar/conflicts"),

  // Morning briefing
  getMorningBriefing: () =>
    apiRequest<{ content: string }>("/api/morning-briefing", {
      method: "GET",
    }),

  // First-use insight (§21) — called once on first Today screen open
  getFirstUseInsight: () =>
    apiRequest<{ first_insight: string; is_fallback: boolean }>("/api/first-use", {
      method: "GET",
    }),

  // Push tokens
  registerPushToken: (token: string, platform: string, deviceName?: string) =>
    apiRequest<{ success: boolean; token_id: string }>("/api/push-tokens", {
      method: "POST",
      body: JSON.stringify({ token, platform, device_name: deviceName }),
    }),

  // C3 — Overspend push notification
  // Fire-and-forget: call after a transaction is saved. No throw on failure.
  checkBudgetOverspend: async (categoryId: string): Promise<void> => {
    try {
      await apiRequest<{ sent?: boolean; skipped?: boolean }>(
        "/api/budget/check-overspend",
        {
          method: "POST",
          body: JSON.stringify({ categoryId }),
        }
      );
    } catch {
      // Silently swallow — notification failure should never block the UI
    }
  },
};
