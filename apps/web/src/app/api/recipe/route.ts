/**
 * POST /api/recipe
 *
 * Returns a recipe for a given meal name.
 *
 * STATUS: STUB — requires ANTHROPIC_API_KEY to generate real recipes.
 * When the key is present, wire the Anthropic call following the pattern
 * in apps/web/src/app/api/chat/route.ts.
 *
 * Without the key, this endpoint returns 501 Not Implemented so callers
 * can surface a clear "not available" state rather than a generic template.
 */

import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Gate: real recipe generation requires the Anthropic API key.
    // Without it, return 501 so the client can show a graceful "not available" state.
    // TODO: wire Anthropic call here (see chat/route.ts for the pattern).
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Recipe generation is not yet available." },
        { status: 501 }
      );
    }

    const { mealName } = await request.json();

    if (!mealName) {
      return NextResponse.json({ error: "Meal name is required" }, { status: 400 });
    }

    // TODO: call Anthropic here — pattern in apps/web/src/app/api/chat/route.ts
    return NextResponse.json(
      { error: "Recipe generation is not yet implemented." },
      { status: 501 }
    );
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Failed to generate recipe" }, { status: 500 });
  }
}
