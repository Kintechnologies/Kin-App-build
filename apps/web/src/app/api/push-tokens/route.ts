import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/api-auth";

/**
 * POST /api/push-tokens
 * Saves a push notification token for the authenticated user
 * Used by mobile app to register for push notifications
 */
export async function POST(request: Request) {
  try {
    const { token, platform, device_name } = await request.json();

    if (!token || !platform) {
      return NextResponse.json(
        { error: "token and platform are required" },
        { status: 400 }
      );
    }

    if (!["ios", "android", "web"].includes(platform)) {
      return NextResponse.json(
        { error: "platform must be ios, android, or web" },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    // Upsert push token (update if exists, insert if not)
    const { data, error } = await supabase
      .from("push_tokens")
      .upsert(
        {
          profile_id: user.id,
          token,
          platform,
          device_name: device_name || null,
          active: true,
        },
        {
          onConflict: "profile_id,token",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error saving push token:", error);
      return NextResponse.json(
        { error: "Failed to save push token" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, token_id: data.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/push-tokens:", error);
    return NextResponse.json(
      { error: "Failed to register push token" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/push-tokens
 * Returns all active push tokens for the authenticated user
 */
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("push_tokens")
      .select("*")
      .eq("profile_id", user.id)
      .eq("active", true);

    if (error) {
      console.error("Error fetching push tokens:", error);
      return NextResponse.json(
        { error: "Failed to fetch push tokens" },
        { status: 500 }
      );
    }

    return NextResponse.json({ tokens: data });
  } catch (error) {
    console.error("Error in GET /api/push-tokens:", error);
    return NextResponse.json(
      { error: "Failed to fetch push tokens" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/push-tokens
 * Deactivates a push token (soft delete)
 */
export async function DELETE(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "token is required" },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("push_tokens")
      .update({ active: false })
      .eq("profile_id", user.id)
      .eq("token", token);

    if (error) {
      console.error("Error deactivating push token:", error);
      return NextResponse.json(
        { error: "Failed to deactivate push token" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/push-tokens:", error);
    return NextResponse.json(
      { error: "Failed to deactivate push token" },
      { status: 500 }
    );
  }
}
