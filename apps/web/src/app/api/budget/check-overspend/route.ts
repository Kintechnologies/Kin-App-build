/**
 * C3 — Overspend Push Notification
 * POST /api/budget/check-overspend
 *
 * Called by the mobile app after a transaction is added.
 * Checks if the budget category is now at or above 80% of monthly limit.
 * If yes, and it hasn't been notified this month: sends an Expo push notification
 * and updates last_overspend_notified_at.
 *
 * Max one notification per category per calendar month.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";

const OVERSPEND_THRESHOLD = 0.8; // 80%
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface BudgetCategory {
  id: string;
  name: string;
  monthly_limit: number;
  last_overspend_notified_at: string | null;
}

interface PushToken {
  token: string;
}

async function sendExpoPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>
): Promise<void> {
  if (tokens.length === 0) return;

  const messages = tokens.map((token) => ({
    to: token,
    sound: "default",
    title,
    body,
    data,
    priority: "high",
  }));

  await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { categoryId } = body as { categoryId?: string };

    if (!categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }

    const supabase = createClient();

    // 1. Fetch the budget category
    const { data: category, error: catError } = await supabase
      .from("budget_categories")
      .select("id, name, monthly_limit, last_overspend_notified_at")
      .eq("id", categoryId)
      .eq("profile_id", user.id)
      .single<BudgetCategory>();

    if (catError || !category) {
      return NextResponse.json({ skipped: true, reason: "Category not found" });
    }

    // 2. Check if already notified this calendar month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    if (category.last_overspend_notified_at) {
      const lastNotified = new Date(category.last_overspend_notified_at);
      if (lastNotified >= monthStart) {
        return NextResponse.json({
          skipped: true,
          reason: "Already notified this month",
        });
      }
    }

    // 3. Sum all transactions for this category this calendar month
    const monthStartStr = monthStart.toISOString().split("T")[0];
    const { data: txData, error: txError } = await supabase
      .from("transactions")
      .select("amount")
      .eq("profile_id", user.id)
      .eq("category_id", categoryId)
      .gte("date", monthStartStr);

    if (txError) {
      return NextResponse.json({ error: "Failed to sum transactions" }, { status: 500 });
    }

    const totalSpent = (txData ?? []).reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );
    const percentUsed = totalSpent / category.monthly_limit;

    if (percentUsed < OVERSPEND_THRESHOLD) {
      return NextResponse.json({
        skipped: true,
        reason: `${(percentUsed * 100).toFixed(0)}% used — below threshold`,
      });
    }

    // 4. Fetch the user's push tokens
    const { data: pushTokens } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("profile_id", user.id)
      .eq("active", true)
      .returns<PushToken[]>();

    const tokens = (pushTokens ?? []).map((pt) => pt.token);

    if (tokens.length === 0) {
      return NextResponse.json({
        skipped: true,
        reason: "No active push tokens",
      });
    }

    // 5. Build notification message
    const percentStr = Math.round(percentUsed * 100);
    const spentStr = `$${totalSpent.toFixed(0)}`;
    const limitStr = `$${category.monthly_limit.toFixed(0)}`;

    const title = "Budget Heads-Up";
    const notifyBody =
      percentUsed >= 1.0
        ? `${category.name} is over budget — ${spentStr} of ${limitStr} this month.`
        : `${category.name} is at ${percentStr}% — ${spentStr} of ${limitStr} this month.`;

    // 6. Send push notification
    await sendExpoPushNotification(tokens, title, notifyBody, {
      type: "budget_alert",
      categoryId,
      categoryName: category.name,
    });

    // 7. Update last_overspend_notified_at to prevent duplicate notifications this month
    await supabase
      .from("budget_categories")
      .update({ last_overspend_notified_at: now.toISOString() })
      .eq("id", categoryId)
      .eq("profile_id", user.id);

    return NextResponse.json({
      sent: true,
      categoryName: category.name,
      percentUsed: `${percentStr}%`,
      tokensNotified: tokens.length,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Error in POST /api/budget/check-overspend:", error);
    }
    return NextResponse.json(
      { error: "Failed to check overspend" },
      { status: 500 }
    );
  }
}
