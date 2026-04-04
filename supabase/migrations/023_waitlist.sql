-- ═══════════════════════════════════════════════════════════════
-- 023 · Public Waitlist (#67 — two-URL strategy)
-- ═══════════════════════════════════════════════════════════════
-- Stores email addresses collected on the kinai.family marketing
-- landing page before users receive a beta invite.
-- No auth required — POST /api/waitlist is a public endpoint.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS waitlist (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT        NOT NULL,
  source       TEXT        NOT NULL DEFAULT 'landing_page',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT waitlist_email_unique UNIQUE (email),
  CONSTRAINT waitlist_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

COMMENT ON TABLE waitlist IS
  'Email addresses captured on the kinai.family public marketing site.';

COMMENT ON COLUMN waitlist.source IS
  'Where the signup came from — ''landing_page'', ''referral'', etc.';

-- RLS: no user-level access. Only service role (admin client) can read/write.
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Deny all direct access; the API route uses the service role key.
CREATE POLICY "no_direct_access"
  ON waitlist
  FOR ALL
  USING (false);
