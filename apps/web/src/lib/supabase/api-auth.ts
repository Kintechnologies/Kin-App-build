import { createClient } from "./server";

// Supports both cookie auth (web) and Bearer token auth (mobile)
export async function getAuthenticatedUser(request: Request) {
  const supabase = createClient();

  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    return user;
  }

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
