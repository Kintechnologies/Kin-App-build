# CTO Flags — P0 Issues

> These MUST be addressed by Lead Engineer before the next deployment.
> Last updated: 2026-04-08 (Run 7)

---

## ✅ FLAG-005 · Marketing waitlist route uses anon key — blocked by RLS, all submissions fail — RESOLVED

**File:** `apps/marketing/src/app/api/waitlist/route.ts:17–25`
**Commit introduced:** `07cea50` (Rebuild marketing site with warm dark design system)
**Severity:** P0 — top-of-funnel lead collection is completely broken

### What's wrong

The marketing waitlist route constructs a Supabase client with the anon key:

```ts
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
```

But `023_waitlist.sql` explicitly locks the `waitlist` table to service-role only:

```sql
-- Deny all direct access; the API route uses the service role key.
CREATE POLICY "no_direct_access"
  ON waitlist
  FOR ALL
  USING (false);
```

An anon-key client is denied by this policy. Every POST to `/api/waitlist` on the marketing site will hit the Supabase error path (non-23505), log `console.error("Supabase insert error:", error)`, and return `500 "Failed to join waitlist"` to the user. No emails are being collected.

### Impact

Every marketing site visitor who enters their email gets a failure response. The waitlist table has zero rows from the marketing site since launch.

### Fix

Replace the anon client with a service-role admin client, matching the pattern already used in `apps/web/src/app/api/waitlist/route.ts`:

```ts
// apps/marketing/src/app/api/waitlist/route.ts
import { createClient } from "@supabase/supabase-js";

// Replace lines 17–25 with:
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Supabase env vars not configured");
  return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});
```

`SUPABASE_SERVICE_ROLE_KEY` must be added to the marketing app's Vercel env (it's already in the main app). Do NOT use `NEXT_PUBLIC_` prefix — service role key must never be exposed to the browser.

---

---

## RESOLVED FLAGS (audit trail)

| Flag | Issue | Resolution |
|---|---|---|
| FLAG-001 | Duplicate migration `027_` prefix | `027_profile_timezone.sql` stub removed; `027_coordination_issues_severity.sql` is a legitimate new migration with a real `ALTER TABLE`. Resolved prior to Run 2. |
| FLAG-002 | RevenueCat webhook no Sentry — silent revenue errors | `import * as Sentry` added; `Sentry.captureException(error)` in outer catch at line 147–148. Resolved prior to Run 2. |
| FLAG-003 | pickup-risk cron auth bypassed when CRON_SECRET unset | Auth guard now uses `if (authHeader !== \`Bearer ${process.env.CRON_SECRET}\`)` — tight pattern, consistent with other cron routes. Resolved prior to Run 2. |
| FLAG-004 | DELETE /api/account FK constraint violations for paired users | `createAdminClient()` nulls `profiles.household_id` and `household_invites.accepted_by_profile_id` before profile delete; dead `invited_by` column reference removed. Tests added in `account-delete.test.ts`. Resolved Run 3. |
| FLAG-005 | Marketing waitlist anon key blocked by RLS | `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `SUPABASE_SERVICE_ROLE_KEY` with `persistSession: false`. `apps/marketing/.env.example` created. Resolved Run 6 (hotfix). |
| FLAG-006 (P0-NEW-BH-1) | `InstrumentSerif-Italic` not registered in `_layout.tsx`; 6 hero elements fell back to system font on device | Re-added `"InstrumentSerif-Italic": require("../assets/fonts/InstrumentSerif-Italic.ttf")` to `useFonts` call in `apps/mobile/app/_layout.tsx`. Font file confirmed present at `assets/fonts/InstrumentSerif-Italic.ttf`. Resolved Run 6 (hotfix commit a83a540). |
