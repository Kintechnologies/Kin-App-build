"""
Kin AI — Demo User Seed Script (idempotent)

Wipes and reseeds two linked demo accounts with realistic dual-income tech-household data.
Safe to re-run: looks up existing auth users by email, deletes their previous demo data,
then re-inserts a fresh week.

  Parent A:  demo@kinai.family    / KinDemo2026!  (Jordan Mitchell)
  Partner:   partner@kinai.family / KinDemo2026!  (Sam Mitchell)

Credentials are loaded from .env (repo root) or apps/web/.env.local.
Required keys: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY.
"""

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

# ── env loading ───────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent
for env_path in (ROOT / ".env", ROOT / "apps" / "web" / ".env.local"):
    if env_path.exists():
        load_dotenv(env_path, override=False)

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not KEY:
    sys.exit(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n"
        "Add them to .env at the repo root or apps/web/.env.local."
    )

H = {
    "Authorization": f"Bearer {KEY}",
    "apikey": KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

# ── HTTP helpers ──────────────────────────────────────────────────────────────
def _check(r, op, path):
    if not r.ok:
        print(f"ERROR {r.status_code} on {op} {path}: {r.text}")
        sys.exit(1)
    return r

def post(path, body):
    return _check(requests.post(f"{SUPABASE_URL}{path}", headers=H, json=body), "POST", path).json()

def patch(table, match_col, match_val, body):
    return _check(
        requests.patch(
            f"{SUPABASE_URL}/rest/v1/{table}?{match_col}=eq.{match_val}",
            headers=H, json=body,
        ),
        "PATCH", table,
    ).json()

def insert(table, body):
    return post(f"/rest/v1/{table}", body)

def delete_where(table, query):
    """DELETE rows from a PostgREST table matching the query string (e.g. profile_id=eq.<uuid>)."""
    r = requests.delete(f"{SUPABASE_URL}/rest/v1/{table}?{query}", headers=H)
    if not r.ok:
        # 404 on missing tables is acceptable; surface anything else
        print(f"WARN delete {table} ({query}): {r.status_code} {r.text}")
    return r

def get_admin_user_by_email(email):
    """Look up an auth user by email via the admin API. Returns user dict or None."""
    r = requests.get(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=H,
        params={"per_page": 1000},
    )
    _check(r, "GET", "/auth/v1/admin/users")
    payload = r.json()
    users = payload.get("users", payload) if isinstance(payload, dict) else payload
    for u in users or []:
        if (u.get("email") or "").lower() == email.lower():
            return u
    return None

def upsert_auth_user(email, password, full_name):
    """Create the auth user if missing, otherwise return the existing one."""
    existing = get_admin_user_by_email(email)
    if existing:
        print(f"  reusing {email} ({existing['id']})")
        return existing["id"]
    created = post("/auth/v1/admin/users", {
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {"full_name": full_name},
    })
    print(f"  created {email} ({created['id']})")
    return created["id"]

# ── time helpers ──────────────────────────────────────────────────────────────
# Anchor = today 00:00 UTC; offsets/hours interpreted as ET (UTC-4) so 9am ET = 13:00 UTC.
TODAY_UTC = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

def ts(day_offset, hour, minute=0):
    """ISO timestamp: today + day_offset, at hour:minute ET (UTC-4)."""
    return (TODAY_UTC + timedelta(days=day_offset, hours=hour + 4, minutes=minute)).isoformat()

def date_str(day_offset):
    return (TODAY_UTC + timedelta(days=day_offset)).date().isoformat()

# ── 1. Auth users (idempotent) ────────────────────────────────────────────────
print("Resolving auth users...")
jordan_id = upsert_auth_user("demo@kinai.family",    "KinDemo2026!", "Jordan Mitchell")
sam_id    = upsert_auth_user("partner@kinai.family", "KinDemo2026!", "Sam Mitchell")

USER_IDS = [jordan_id, sam_id]
HOUSEHOLD_ID = jordan_id  # Jordan's profile id is the household anchor

# ── 2. Wipe existing demo data ────────────────────────────────────────────────
print("Wiping existing demo data...")

ids_csv = ",".join(USER_IDS)

# Per-profile tables (delete by profile_id)
for table in (
    "calendar_events",
    "kin_check_ins",
    "morning_briefings",
    "family_members",
    "conversations",
    "chat_threads",
    "sms_conversations",
):
    delete_where(table, f"profile_id=in.({ids_csv})")

# Household-scoped tables
delete_where("coordination_issues", f"household_id=eq.{HOUSEHOLD_ID}")
delete_where("household_invites",   f"inviter_profile_id=eq.{HOUSEHOLD_ID}")

# ── 3. Profiles ───────────────────────────────────────────────────────────────
print("Updating profiles...")

patch("profiles", "id", jordan_id, {
    "first_name": "Jordan",
    "family_name": "Mitchell",
    "household_type": "two-parent",
    "subscription_tier": "family",
    "onboarding_completed": True,
    "parent_role": "parent",
    "household_id": None,  # primary parent — household anchor
})

patch("profiles", "id", sam_id, {
    "first_name": "Sam",
    "family_name": "Mitchell",
    "household_type": "two-parent",
    "subscription_tier": "family",
    "onboarding_completed": True,
    "parent_role": "parent",
    "household_id": jordan_id,
})

# ── 4. Family members (kids) ──────────────────────────────────────────────────
print("Seeding family members...")
for member in (
    {"profile_id": jordan_id, "name": "Jaxon", "age": 3, "member_type": "child"},
    {"profile_id": jordan_id, "name": "Ellie", "age": 6, "member_type": "child"},
):
    insert("family_members", member)

# ── 5. Household invite (accepted) ────────────────────────────────────────────
print("Creating accepted household invite...")
insert("household_invites", {
    "inviter_profile_id": jordan_id,
    "invitee_email": "partner@kinai.family",
    "invite_code": f"DEMO-SEED-{TODAY_UTC.date().isoformat()}",
    "accepted": True,
    "accepted_by_profile_id": sam_id,
    "accepted_at": ts(-1, 18),
    "expires_at": ts(6, 23),
})

# ── 6. Calendar events — dual-income tech household ───────────────────────────
# Today (offset 0) in 2026-05-03 is a Sunday; offsets 1..7 are Mon..Sun.
# Spread 7 days from today.
print("Seeding calendar events...")

JORDAN_COLOR = "#7AADCE"  # Jordan's work events
SAM_COLOR    = "#D4748A"  # Sam's work events
KID_COLOR    = "#7CB87A"  # kid events
SHARED_COLOR = "#9B7EBD"  # shared family events

def event(profile_id, title, day, start_h, end_h,
          start_m=0, end_m=0,
          shared=False, kid=False, member=None,
          desc=None, location=None, color=None):
    e = {
        "profile_id": profile_id,
        "household_id": HOUSEHOLD_ID,
        "owner_parent_id": profile_id,
        "title": title,
        "start_time": ts(day, start_h, start_m),
        "end_time":   ts(day, end_h,   end_m),
        "all_day": False,
        "is_shared": shared,
        "is_kid_event": kid,
        "external_source": "kin",
        "sync_status": "synced",
    }
    if member:   e["assigned_member"] = member
    if desc:     e["description"] = desc
    if location: e["location"] = location
    if color:    e["color"] = color
    return e

events = []

# Daily standups for both parents (weekdays = offsets 1..5 from Sunday today)
for day in (1, 2, 3, 4, 5):
    events.append(event(jordan_id, "Daily standup", day,  9, 9, end_m=15,
                        color=JORDAN_COLOR, desc="Engineering team — Zoom"))
    events.append(event(sam_id,    "Daily standup", day,  9, 9, end_m=30,
                        start_m=30,
                        color=SAM_COLOR,   desc="Product team — Zoom"))

# Daycare pickup every weekday (Jaxon)
for day in (1, 2, 3, 4, 5):
    events.append(event(jordan_id, "Jaxon daycare pickup", day, 17, 18,
                        start_m=45, end_m=15,
                        kid=True, member="Jaxon", color=KID_COLOR,
                        location="Bright Horizons", desc="Hard stop — they charge after 6:15pm"))

# Monday — All-hands + sprint planning context
events.append(event(jordan_id, "Weekly all-hands",     1, 14, 15,
                    color=JORDAN_COLOR, desc="Company-wide — Zoom"))
events.append(event(sam_id,    "Weekly all-hands",     1, 14, 15,
                    color=SAM_COLOR,   desc="Company-wide — Zoom"))
events.append(event(sam_id,    "Roadmap review",       1, 16, 17,
                    color=SAM_COLOR,   desc="With VP Product"))

# Tuesday — Sprint planning
events.append(event(jordan_id, "Sprint planning",      2, 10, 11, end_m=30,
                    color=JORDAN_COLOR, desc="2-week sprint kickoff"))
events.append(event(sam_id,    "User research review", 2, 13, 14,
                    color=SAM_COLOR,   desc="Q2 interviews — synthesis"))
events.append(event(jordan_id, "Ellie soccer practice", 2, 17, 18, end_m=30,
                    kid=True, member="Ellie", color=KID_COLOR,
                    location="Riverside Field 3"))

# Wednesday — 1:1s + pediatrician
events.append(event(jordan_id, "1:1 with manager",     3, 11, 11, end_m=30,
                    color=JORDAN_COLOR))
events.append(event(sam_id,    "1:1 with manager",     3, 13, 14,
                    color=SAM_COLOR))
events.append(event(jordan_id, "Jaxon pediatrician",   3, 15, 16,
                    kid=True, member="Jaxon", color=KID_COLOR,
                    location="Children's Health, 2nd Ave",
                    desc="3-year well visit + vaccines"))

# Thursday — Design review + dentist
events.append(event(jordan_id, "Design review",        4, 15, 16,
                    color=JORDAN_COLOR, desc="Q2 redesign critique"))
events.append(event(sam_id,    "Customer call — Acme", 4, 11, 12,
                    color=SAM_COLOR))
events.append(event(jordan_id, "Dentist appointment",  4, 16, 17, end_m=30,
                    color=JORDAN_COLOR, desc="Dr. Patel — annual cleaning",
                    location="Smile Dental, Brookline"))

# Friday — wind-down
events.append(event(sam_id,    "Eng/Product sync",     5, 10, 11,
                    color=SAM_COLOR))
events.append(event(jordan_id, "Demo Friday",          5, 15, 16,
                    color=JORDAN_COLOR, desc="Team demos — bring the prototype"))

# Saturday family time (offset 6)
events.append(event(jordan_id, "Ellie soccer game",    6,  9, 11,
                    kid=True, member="Ellie", color=KID_COLOR,
                    location="Riverside Park", desc="Home game vs. Newton"))
events.append(event(sam_id,    "Morning run",          6,  7, 8,
                    color=SAM_COLOR))
events.append(event(jordan_id, "Farmers market",       6, 11, 12,
                    shared=True, color=SHARED_COLOR,
                    location="Grand Ave", desc="Bring tote bags"))
events.append(event(jordan_id, "Date night",           6, 19, 21,
                    shared=True, color=SHARED_COLOR,
                    location="Oleana", desc="7pm reservation — sitter confirmed"))

# Sunday again (offset 7)
events.append(event(jordan_id, "Family brunch",        7, 10, 11, end_m=30,
                    shared=True, color=SHARED_COLOR,
                    desc="Grandma's — bring the kids' overnight bag"))

for e in events:
    insert("calendar_events", e)
print(f"  {len(events)} events seeded")

# ── 7. Coordination issues ────────────────────────────────────────────────────
print("Seeding coordination issues...")

# OPEN — RED daycare pickup conflict tomorrow (Monday)
insert("coordination_issues", {
    "household_id": HOUSEHOLD_ID,
    "trigger_type": "pickup_risk",
    "state": "OPEN",
    "severity": "RED",
    "content": (
        "Both parents have late-running meetings tomorrow that overlap Jaxon's 5:45pm "
        "daycare pickup. Jordan's 1:1 ends at 5pm and Sam's roadmap review runs to 5pm — "
        "tight margin and Bright Horizons charges after 6:15pm."
    ),
    "event_window_start": ts(1, 17, 0),
    "event_window_end":   ts(1, 18, 15),
    "surfaced_at":        ts(0, 8, 30),
})

# ACKNOWLEDGED — YELLOW Wednesday pediatrician + design review collision
insert("coordination_issues", {
    "household_id": HOUSEHOLD_ID,
    "trigger_type": "schedule_compression",
    "state": "ACKNOWLEDGED",
    "severity": "YELLOW",
    "content": (
        "Wednesday is compressed: Jaxon's pediatrician is at 3pm and Jordan has a "
        "design review at 3pm. Sam has back-to-back calls until 4pm. Jordan needs "
        "to move the design review or Sam needs to swap a call."
    ),
    "event_window_start": ts(3, 14, 0),
    "event_window_end":   ts(3, 16, 30),
    "surfaced_at":        ts(-1, 20, 0),
    "acknowledged_at":    ts(-1, 21, 15),
})

# RESOLVED — last week's pickup risk
insert("coordination_issues", {
    "household_id": HOUSEHOLD_ID,
    "trigger_type": "pickup_risk",
    "state": "RESOLVED",
    "severity": "YELLOW",
    "content": "Jordan's sprint planning ran long Friday — Sam covered Jaxon's pickup.",
    "event_window_start": ts(-2, 17, 30),
    "event_window_end":   ts(-2, 18, 0),
    "surfaced_at":        ts(-2, 10, 0),
    "acknowledged_at":    ts(-2, 10, 45),
    "resolved_at":        ts(-2, 18, 15),
})

# ── 8. Chat threads + messages ────────────────────────────────────────────────
print("Seeding chat threads and messages...")

personal_thread = insert("chat_threads", {
    "profile_id": jordan_id,
    "thread_type": "personal",
    "title": "Kin",
})
personal_id = personal_thread[0]["id"] if isinstance(personal_thread, list) else personal_thread["id"]

household_thread = insert("chat_threads", {
    "profile_id": jordan_id,
    "thread_type": "household",
    "household_id": HOUSEHOLD_ID,
    "title": "Home",
})
household_id_thread = household_thread[0]["id"] if isinstance(household_thread, list) else household_thread["id"]

personal_msgs = [
    ("user",      "What's actually on my plate this week?",                                                      ts(-2, 9, 0)),
    ("assistant", "Three things to stay ahead of: Jaxon's pediatrician Wednesday at 3pm (you'll need to move "
                  "the design review), date night Saturday at 7pm at Oleana, and demo Friday — your prototype's "
                  "on the agenda. Sam covered Jaxon's pickup on Friday so you're square there.",                  ts(-2, 9, 1)),
    ("user",      "Right — design review conflict. Can I push it?",                                              ts(-2, 9, 4)),
    ("assistant", "Probably. The design review is a Q2 redesign critique with the team — your call to reschedule. "
                  "Thursday 4pm is open if you want me to draft a Slack to the design lead.",                     ts(-2, 9, 5)),
    ("user",      "Yeah draft it. Also — confirm the Oleana reservation?",                                       ts(-1, 14, 0)),
    ("assistant", "Drafted. Oleana confirms 7pm for two on Saturday — confirmation in your inbox. Sitter is "
                  "booked from 6:30 to 10:30pm.",                                                                  ts(-1, 14, 1)),
    ("user",      "Perfect. Thanks.",                                                                            ts(-1, 14, 3)),
    ("assistant", "I'll keep an eye on Wednesday — if Sam's calls shift I'll flag the pickup window again.",     ts(-1, 14, 3)),
]

household_msgs = [
    ("user",      "Tomorrow's pickup is going to be tight — both of us have late meetings.",                     ts(-1, 19, 0)),
    ("assistant", "Yeah — Jordan's 1:1 ends at 5pm, Sam's roadmap review runs to 5pm, daycare closes at 6:15pm. "
                  "Whoever finishes first should head straight to Bright Horizons. Want me to set a 4:55pm "
                  "departure ping for both of you?",                                                              ts(-1, 19, 1)),
    ("user",      "Yes. And Wednesday?",                                                                         ts(-1, 19, 8)),
    ("assistant", "Wednesday's the bigger one. Jaxon's pediatrician is 3pm, Jordan's design review is 3pm. "
                  "I'd suggest Jordan moves the design review to Thursday 4pm — it's open. Sam's back-to-back "
                  "until 4pm so can't take the appointment.",                                                      ts(-1, 19, 9)),
    ("user",      "Agreed. Move it.",                                                                            ts(-1, 19, 12)),
    ("assistant", "On it — drafted a note to the design lead in Jordan's personal thread.",                       ts(-1, 19, 13)),
]

def seed_messages(msgs, thread_id, profile_id):
    for role, content, created_at in msgs:
        insert("conversations", {
            "profile_id": profile_id,
            "thread_id": thread_id,
            "role": role,
            "content": content,
            "created_at": created_at,
        })

seed_messages(personal_msgs,  personal_id,         jordan_id)
seed_messages(household_msgs, household_id_thread, jordan_id)
print(f"  {len(personal_msgs)} personal messages, {len(household_msgs)} household messages")

# ── 9. SMS conversations (recent inbound/outbound) ────────────────────────────
print("Seeding SMS conversations...")

sms_log = [
    (jordan_id, "outbound",
     "Morning Jordan — Jaxon's pickup tomorrow is the tight spot. Sam has roadmap review until 5pm. "
     "I'll ping whoever's free at 4:55pm.",
     ts(0, 7, 30)),
    (jordan_id, "inbound",
     "ok. I can probably duck out by 4:50.",
     ts(0, 7, 32)),
    (jordan_id, "outbound",
     "Got it — I'll send Sam a heads-up so they don't double-book.",
     ts(0, 7, 33)),
    (sam_id, "outbound",
     "Heads up Sam — Jordan's covering Jaxon's pickup tomorrow. Your roadmap review is on.",
     ts(0, 7, 34)),
    (sam_id, "inbound",
     "thx 🙏",
     ts(0, 7, 36)),
]
for profile_id, direction, body, sent_at in sms_log:
    insert("sms_conversations", {
        "profile_id": profile_id,
        "direction": direction,
        "body": body,
        "from_number": "+15555550100" if direction == "outbound" else "+15555550199",
        "to_number":   "+15555550199" if direction == "outbound" else "+15555550100",
        "sent_at": sent_at,
    })
print(f"  {len(sms_log)} SMS messages seeded")

# ── 10. Morning briefings ─────────────────────────────────────────────────────
print("Seeding morning briefings...")

today_briefing = (
    "Sunday — light day on paper but tomorrow's the squeeze.\n\n"
    "Today: Ellie's soccer game at 9am (Riverside Park, home vs. Newton), farmers market at 11am, "
    "date night at Oleana at 7pm — sitter confirmed 6:30–10:30pm.\n\n"
    "Tomorrow: Jaxon daycare pickup is 5:45pm and both of you run late — Jordan's 1:1 ends at 5pm, "
    "Sam's roadmap review runs to 5pm. I'll ping whoever's free at 4:55pm.\n\n"
    "Wednesday heads-up: pediatrician + design review collide at 3pm. Suggesting Jordan moves the design "
    "review to Thursday 4pm."
)
insert("morning_briefings", {
    "profile_id": jordan_id,
    "briefing_date": date_str(0),
    "content": today_briefing,
    "delivery_status": "sent",
    "sent_at": ts(0, 6, 30),
})
insert("morning_briefings", {
    "profile_id": sam_id,
    "briefing_date": date_str(0),
    "content": today_briefing,
    "delivery_status": "sent",
    "sent_at": ts(0, 6, 30),
})

# Yesterday's briefing for both — historical context
yesterday_briefing = (
    "Saturday — slow start. Sam's morning run at 7am, then nothing until evening. "
    "Use the morning to clear weekday prep: Jaxon's daycare bag, Ellie's cleats. "
    "Jordan: design review prep is still open for Thursday."
)
insert("morning_briefings", {
    "profile_id": jordan_id,
    "briefing_date": date_str(-1),
    "content": yesterday_briefing,
    "delivery_status": "sent",
    "sent_at": ts(-1, 6, 30),
})
print("  4 morning briefings seeded")

# ── 11. Check-ins ─────────────────────────────────────────────────────────────
print("Seeding check-ins...")

insert("kin_check_ins", {
    "profile_id": jordan_id,
    "household_id": HOUSEHOLD_ID,
    "content": "Date night's in 4 hours — sitter arrives at 6:30. Want a quick reminder at 6:15?",
    "prompt": "Set a 6:15pm reminder?",
    "dismissed": False,
    "check_in_date": date_str(0),
})

insert("kin_check_ins", {
    "profile_id": jordan_id,
    "household_id": HOUSEHOLD_ID,
    "content": "Ellie's soccer game ended at 11 — you've got a clear stretch until 7pm.",
    "prompt": None,
    "dismissed": True,
    "check_in_date": date_str(0),
})

insert("kin_check_ins", {
    "profile_id": sam_id,
    "household_id": HOUSEHOLD_ID,
    "content": "Tomorrow you've got back-to-back from 9 to 5 — daycare pickup is on Jordan.",
    "prompt": None,
    "dismissed": False,
    "check_in_date": date_str(0),
})
print("  3 check-ins seeded")

# ── Done ──────────────────────────────────────────────────────────────────────
print("\n✅ Demo seed complete!")
print("─" * 56)
print(f"  Login A: demo@kinai.family     / KinDemo2026!")
print(f"  Login B: partner@kinai.family  / KinDemo2026!")
print(f"  Jordan ID: {jordan_id}")
print(f"  Sam ID:    {sam_id}")
print("─" * 56)
print(f"  {len(events)} calendar events across the next 7 days")
print(f"  3 coordination issues (1 OPEN/RED, 1 ACK/YELLOW, 1 RESOLVED)")
print(f"  2 chat threads with {len(personal_msgs) + len(household_msgs)} messages")
print(f"  {len(sms_log)} SMS messages")
print(f"  3 morning briefings, 3 check-ins, 2 kids in family_members")
