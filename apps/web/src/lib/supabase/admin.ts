import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase Admin client — uses the service role key to bypass RLS.
 * Only use server-side (API routes / server components). Never expose to client.
 *
 * Requires env var: SUPABASE_SERVICE_ROLE_KEY
 * Austin: add this key to .env.local and Vercel env vars.
 * Find it in: Supabase dashboard → Project Settings → API → service_role key.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
