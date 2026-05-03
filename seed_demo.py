"""
Kin AI — Demo User Seed Script
Creates two linked demo accounts with a full week of realistic family data.
  Parent A:  demo@kinai.family   / KinDemo2026!   (Jordan Mitchell)
  Partner:   partner@kinai.family / KinDemo2026!   (Sam Mitchell)
"""

import requests, json, sys
from datetime import datetime, timedelta, timezone

SUPABASE_URL = "https://coxqdpcffmsncvisfyvj.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveHFkcGNmZm1zbmN2aXNmeXZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI3ODc1MCwiZXhwIjoyMDg5ODU0NzUwfQ.FrbCtBxkfq08K7LtzmxUK1qp2AnBnxz2fPw99yFNKjE"

H = {
    "Authorization": f"Bearer {KEY}",
    "apikey": KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

def post(path, body):
    r = requests.post(f"{SUPABASE_URL}{path}", headers=H, json=body)
    if not r.ok:
        print(f"ERROR {r.status_code} on POST {path}: {r.text}")
        sys.exit(1)
    return r.json()

def patch(table, match_col, match_val, body):
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/{table}?{match_col}=eq.{match_val}",
        headers=H, json=body
    )
    if not r.ok:
        print(f"ERROR {r.status_code} on PATCH {table}: {r.text}")
        sys.exit(1)
    return r.json()

def insert(table, body):
    return post(f"/rest/v1/{table}", body)

def get(table, match_col, match_val):
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table}?{match_col}=eq.{match_val}",
        headers=H
    )
    r.raise_for_status()
    return r.json()

# ── helpers ───────────────────────────────────────────────────────────────────
def ts(day_offset, hour, minute=0):
    """UTC timestamp: today + day_offset, at given hour:minute ET (UTC-4)."""
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return (today + timedelta(days=day_offset, hours=hour + 4, minutes=minute)).isoformat()

# ── 1. Create auth users (idempotent) ─────────────────────────────────────────
print("Creating auth users...")

def find_user_by_email(email):
    r = requests.get(
        f"{SUPABASE_URL}/auth/v1/admin/users?per_page=200",
        headers=H,
    )
    r.raise_for_status()
    for u in r.json().get("users", []):
        if (u.get("email") or "").lower() == email.lower():
            return u
    return None

def get_or_create_user(email, password, full_name):
    existing = find_user_by_email(email)
    if existing:
        print(f"  · {email} exists — reusing id {existing['id']}")
        return existing["id"]
    created = post("/auth/v1/admin/users", {
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {"full_name": full_name},
    })
    print(f"  + created {email} -> {created['id']}")
    return created["id"]

jordan_id = get_or_create_user("demo@kinai.family",    "KinDemo2026!", "Jordan Mitchell")
sam_id    = get_or_create_user("partner@kinai.family", "KinDemo2026!", "Sam Mitchell")

# ── 2. Update profiles (trigger already inserted bare rows) ───────────────────
print("Updating profiles...")

patch("profiles", "id", jordan_id, {
    "first_name": "Jordan",
    "family_name": "Mitchell",
    "household_type": "two-parent",
    "subscription_tier": "family",
    "onboarding_completed": True,
    "parent_role": "parent",
    # Leave today_screen_first_opened NULL so first-use fires on first open
})

patch("profiles", "id", sam_id, {
    "first_name": "Sam",
    "family_name": "Mitchell",
    "household_type": "two-parent",
    "subscription_tier": "family",
    "onboarding_completed": True,
    "parent_role": "parent",
    "household_id": jordan_id,   # Sam is linked to Jordan's household
})

# ── 3. Mark household invite as accepted ──────────────────────────────────────
print("Creating accepted household invite...")
existing_invite = get("household_invites", "invite_code", "DEMO-SEED-2026")
if existing_invite:
    print("  · DEMO-SEED-2026 invite already exists — skipping")
else:
    insert("household_invites", {
        "inviter_profile_id": jordan_id,
        "invitee_email": "partner@kinai.family",
        "invite_code": "DEMO-SEED-2026",
        "accepted": True,
        "accepted_by_profile_id": sam_id,
        "accepted_at": ts(-1, 18),  # accepted yesterday evening
        "expires_at": ts(6, 23),
    })

# ── 3b. Family members (Sam + kids) ───────────────────────────────────────────
print("Seeding family members...")
def upsert_family_member(name, member_type, age=None):
    existing = get("family_members", "name", name)
    existing = [e for e in existing if e.get("profile_id") == jordan_id]
    if existing:
        print(f"  · {name} already in family — skipping")
        return
    body = {"profile_id": jordan_id, "name": name, "member_type": member_type}
    if age is not None:
        body["age"] = age
    insert("family_members", body)
    print(f"  + {name} ({member_type})")

upsert_family_member("Jordan Mitchell", "adult", 38)
upsert_family_member("Sam Mitchell",    "adult", 39)
upsert_family_member("Emma Mitchell",   "child",  8)
upsert_family_member("Nora Mitchell",   "child",  2)

# ── 4. Calendar events ────────────────────────────────────────────────────────
print("Seeding calendar events...")

def event(profile_id, title, day, start_h, end_h, start_m=0, end_m=0,
          shared=False, kid=False, member=None, desc=None, color=None):
    e = {
        "profile_id": profile_id,
        "household_id": jordan_id,
        "owner_parent_id": profile_id,
        "title": title,
        "start_time": ts(day, start_h, start_m),
        "end_time": ts(day, end_h, end_m),
        "all_day": False,
        "is_shared": shared,
        "is_kid_event": kid,
        "external_source": "kin",
        "sync_status": "synced",
    }
    if member: e["assigned_member"] = member
    if desc:   e["description"] = desc
    if color:  e["color"] = color
    return e

events = [
    # ── Saturday Apr 4 (today) ──────────────────────────────────────────────
    event(jordan_id, "Farmers Market",          0,  9, 10,    shared=True,  color="#7AADCE",
          desc="Grand Ave. Bring bags."),
    event(sam_id,    "Morning run",             0,  7,  8,                  color="#D4748A"),
    event(jordan_id, "Emma's soccer practice",  0, 10, 12,    kid=True,  member="Emma", color="#7CB87A"),
    event(jordan_id, "Dentist appointment",     0, 15, 16,                  color="#7AADCE",
          desc="Dr. Patel — annual cleaning"),
    event(sam_id,    "Q2 Finance review call",  0, 15, 16, end_m=30,        color="#D4748A",
          desc="Zoom with Ryan and the team"),
    event(jordan_id, "Nora's swim lesson",      0, 17, 18,    kid=True,  member="Nora", color="#7CB87A"),

    # ── Sunday Apr 5 ────────────────────────────────────────────────────────
    event(jordan_id, "Grocery run",             1,  8,  9,                  color="#7AADCE"),
    event(jordan_id, "Emma's soccer game",      1, 10, 12,    kid=True,  member="Emma", color="#7CB87A",
          desc="Away game — Riverside Park"),
    event(sam_id,    "Brunch with Nadia",       1, 11, 13,                  color="#D4748A"),
    event(sam_id,    "Dinner — Patel family",   1, 19, 21,   shared=True,   color="#D4748A",
          desc="Their place — bring wine"),

    # ── Monday Apr 6 ────────────────────────────────────────────────────────
    event(jordan_id, "Team standup",            2,  9,  9, end_m=30,        color="#7AADCE"),
    event(sam_id,    "1:1 with manager",        2, 11, 12,                  color="#D4748A"),
    event(jordan_id, "School pickup — Emma & Nora", 2, 15, 15, end_m=30, kid=True, member="Emma", color="#7CB87A"),
    event(sam_id,    "Book club",               2, 18, 30, 20, 0,           color="#D4748A",
          desc="At Julia's — 'The God of Small Things'"),

    # ── Tuesday Apr 7 ───────────────────────────────────────────────────────
    event(sam_id,    "Morning gym",             3,  7,  8,                  color="#D4748A"),
    event(jordan_id, "Nora's pediatrician",     3, 14, 15,    kid=True,  member="Nora", color="#7CB87A",
          desc="18-month checkup + vaccines"),
    event(jordan_id, "Date night",              3, 19, 21,   shared=True,   color="#7AADCE",
          desc="Reservation at Oleana, 7pm"),

    # ── Wednesday Apr 8 ─────────────────────────────────────────────────────
    event(jordan_id, "All-hands meeting",       4, 10, 11,                  color="#7AADCE"),
    event(sam_id,    "Lunch with Sarah",        4, 12, 13,                  color="#D4748A"),
    event(jordan_id, "Emma's soccer practice",  4, 16, 17,    kid=True,  member="Emma", color="#7CB87A"),
    event(sam_id,    "Work late",               4, 17, 19,                  color="#D4748A"),

    # ── Thursday Apr 9 ──────────────────────────────────────────────────────
    event(jordan_id, "School pickup",           5, 15, 15, end_m=30,  kid=True, member="Emma", color="#7CB87A"),
    event(sam_id,    "Happy hour with team",    5, 17, 19,                  color="#D4748A"),
    event(jordan_id, "Dinner — Grandma's",      5, 18, 20,   shared=True,   color="#7AADCE"),
]

# Fix the book club event (Monday 6:30pm-8pm ET)
events[14] = event(sam_id, "Book club", 2, 18, 20, start_m=30, end_m=0,
                   color="#D4748A", desc="At Julia's — 'The God of Small Things'")

# Idempotent: skip events that already exist for the household
existing_event_titles = {
    (e.get("title"), e.get("start_time"))
    for e in get("calendar_events", "household_id", jordan_id)
}
inserted_count = 0
for e in events:
    if (e["title"], e["start_time"]) in existing_event_titles:
        continue
    insert("calendar_events", e)
    inserted_count += 1
print(f"  {inserted_count} events seeded ({len(events) - inserted_count} skipped as duplicates)")

# ── 5. Coordination issues ────────────────────────────────────────────────────
print("Seeding coordination issues...")
existing_issues = get("coordination_issues", "household_id", jordan_id)
existing_issue_keys = {(i.get("trigger_type"), i.get("state")) for i in existing_issues}

def upsert_issue(body):
    key = (body["trigger_type"], body["state"])
    if key in existing_issue_keys:
        print(f"  · {key} already exists — skipping")
        return
    insert("coordination_issues", body)

# OPEN — RED pickup risk (today, 3pm conflict)
upsert_issue({
    "household_id": jordan_id,
    "trigger_type": "pickup_risk",
    "state": "OPEN",
    "severity": "RED",
    "content": "Both parents are unavailable for Nora's 5pm swim lesson pickup. Jordan's dentist runs 3–4pm and Nora's lesson ends at 6pm — no confirmed coverage.",
    "event_window_start": ts(0, 17, 0),
    "event_window_end": ts(0, 18, 0),
    "surfaced_at": ts(0, 8, 30),
})

# ACKNOWLEDGED — late schedule change (Monday book club)
upsert_issue({
    "household_id": jordan_id,
    "trigger_type": "late_schedule_change",
    "state": "ACKNOWLEDGED",
    "severity": "YELLOW",
    "content": "Sam's book club moved to 6:30pm Monday — overlaps with the 6pm school pickup window. Jordan is the only available parent.",
    "event_window_start": ts(2, 15, 0),
    "event_window_end": ts(2, 18, 30),
    "surfaced_at": ts(-1, 20, 0),
    "acknowledged_at": ts(-1, 21, 15),
})

# RESOLVED — yesterday's pickup risk (resolved with closure line)
upsert_issue({
    "household_id": jordan_id,
    "trigger_type": "pickup_risk",
    "state": "RESOLVED",
    "severity": "YELLOW",
    "content": "Sam's afternoon meeting conflicted with Emma's 3:30pm school pickup. Jordan covered it.",
    "event_window_start": ts(-1, 15, 30),
    "event_window_end": ts(-1, 16, 0),
    "surfaced_at": ts(-1, 10, 0),
    "acknowledged_at": ts(-1, 10, 45),
    "resolved_at": ts(-1, 16, 15),
})

# ── 6. Chat threads + message history ─────────────────────────────────────────
print("Seeding chat threads and messages...")

def get_or_create_thread(thread_type, title, household_id_val=None):
    threads = get("chat_threads", "profile_id", jordan_id)
    for t in threads:
        if t.get("thread_type") == thread_type:
            print(f"  · {thread_type} thread exists ({t['id']}) — reusing")
            return t["id"]
    body = {"profile_id": jordan_id, "thread_type": thread_type, "title": title}
    if household_id_val:
        body["household_id"] = household_id_val
    res = insert("chat_threads", body)
    new_id = res[0]["id"] if isinstance(res, list) else res["id"]
    print(f"  + {thread_type} thread created ({new_id})")
    return new_id

personal_id  = get_or_create_thread("personal",  "Kin")
household_id = get_or_create_thread("household", "Home", household_id_val=jordan_id)

# Personal thread messages (Jordan ↔ Kin)
personal_msgs = [
    ("user",      "Hey — can you remind me what's on my plate this week?",              ts(-2, 9,  0)),
    ("assistant", "Three things worth staying ahead of: Nora's pediatrician Tuesday at 2pm, the team all-hands Wednesday morning, and date night Tuesday evening — reservation's at Oleana at 7pm. The week looks manageable.", ts(-2, 9,  1)),
    ("user",      "What time does Oleana open? Should I confirm the reservation?",       ts(-2, 9,  5)),
    ("assistant", "They open at 5:30pm for dinner. Your reservation's at 7pm — I'd confirm by tomorrow afternoon to be safe.",  ts(-2, 9,  6)),
    ("user",      "Done. Also — Sam mentioned possibly adding a thing Monday evening. Will that conflict with pickup?", ts(-1, 14, 0)),
    ("assistant", "It would. School pickup for Emma and Nora is at 3:30pm Monday. If Sam's tied up Monday evening, you'd be covering both pickup and dinner. I'll flag it when the calendar updates.",  ts(-1, 14, 1)),
    ("user",      "Yeah, flag it. Thanks.",                                              ts(-1, 14, 3)),
    ("assistant", "I'll keep an eye on it.",                                             ts(-1, 14, 3)),
]

# Household thread messages
household_msgs = [
    ("user",      "Sam added book club Monday at 6:30. That overlaps with my pickup window.", ts(-1, 19, 0)),
    ("assistant", "Flagged it — you're the only available parent for the 3:30pm pickup if Sam's book club starts at 6:30pm. The window's tight but workable if you leave by 3:15pm.", ts(-1, 19, 1)),
    ("user",      "What about Tuesday? Are we actually free for date night?",            ts(-1, 19, 10)),
    ("assistant", "Tuesday evening is clear for both of you. Nora's pediatrician is at 2pm and should be done by 3pm. Nothing else until your 7pm reservation.",  ts(-1, 19, 11)),
    ("user",      "Perfect. Don't let anything get scheduled over it.",                  ts(-1, 19, 14)),
    ("assistant", "I'll flag anything that lands Tuesday evening.",                      ts(-1, 19, 15)),
]

def seed_messages(msgs, thread_id, profile_id):
    existing = get("conversations", "thread_id", thread_id)
    if existing:
        print(f"  · {len(existing)} messages already in thread — skipping")
        return
    for role, content, created_at in msgs:
        insert("conversations", {
            "profile_id": profile_id,
            "thread_id": thread_id,
            "role": role,
            "content": content,
            "created_at": created_at,
        })

seed_messages(personal_msgs, personal_id, jordan_id)
seed_messages(household_msgs, household_id, jordan_id)
print(f"  {len(personal_msgs)} personal messages, {len(household_msgs)} household messages (or skipped)")

# ── 7. Check-ins ──────────────────────────────────────────────────────────────
print("Seeding check-ins...")

existing_checkins = get("kin_check_ins", "profile_id", jordan_id)
if existing_checkins:
    print(f"  · {len(existing_checkins)} check-ins already exist — skipping")
else:
    insert("kin_check_ins", {
        "profile_id": jordan_id,
        "household_id": jordan_id,
        "content": "Dinner's in about 3 hours — nothing on the calendar tonight.",
        "prompt": "Want to flag what you're making so Sam knows?",
        "dismissed": False,
        "check_in_date": "2026-04-04",
    })
    insert("kin_check_ins", {
        "profile_id": jordan_id,
        "household_id": jordan_id,
        "content": "Emma's soccer practice ends at noon — you've got a 3-hour window before your dentist.",
        "prompt": None,
        "dismissed": True,
        "check_in_date": "2026-04-04",
    })
    print("  2 check-ins seeded")

# ── 8. Morning briefings (today, for the dashboard) ──────────────────────────
print("Seeding today's morning briefings...")
from datetime import date as _date
today_iso = _date.today().isoformat()

def upsert_briefing(profile_id, content):
    rows = get("morning_briefings", "profile_id", profile_id)
    for r in rows:
        if r.get("briefing_date") == today_iso:
            print(f"  · briefing for {profile_id} on {today_iso} exists — skipping")
            return
    insert("morning_briefings", {
        "profile_id": profile_id,
        "briefing_date": today_iso,
        "content": content,
        "delivery_status": "sent",
        "sent_at": datetime.now(timezone.utc).isoformat(),
    })
    print(f"  + briefing for {profile_id} on {today_iso}")

upsert_briefing(jordan_id, (
    "Good morning, Jordan. Three things on the radar today:\n\n"
    "1. Emma's soccer practice runs 10am–12pm. Plan to be back by noon.\n"
    "2. Your dentist with Dr. Patel is 3–4pm — Sam's Q2 finance call ends at 4:30pm, "
    "so neither of you is available for Nora's 5pm swim pickup. I flagged this RED — "
    "confirm coverage when you can.\n"
    "3. Farmers Market at Grand Ave 9–10am, weather looks clear.\n\n"
    "I've got eyes on the rest of the week."
))
upsert_briefing(sam_id, (
    "Good morning, Sam. Today's lighter:\n\n"
    "1. Morning run scheduled 7–8am.\n"
    "2. Q2 Finance review call with Ryan at 3pm — should wrap by 4:30pm.\n"
    "3. Heads up: Jordan's dentist (3–4pm) and Nora's swim pickup (5pm) overlap "
    "with your call. I flagged it RED so you both know to coordinate before noon."
))

# ── Done ──────────────────────────────────────────────────────────────────────
print("\n✅ Demo seed complete!")
print("─" * 40)
print("  Login A:  demo@kinai.family     / KinDemo2026!")
print("  Login B:  partner@kinai.family  / KinDemo2026!")
print(f"  Jordan ID: {jordan_id}")
print(f"  Sam ID:    {sam_id}")
print("─" * 40)
print("  Jordan sees: OPEN alert + ACKNOWLEDGED alert + RESOLVED alert")
print("  Today screen: 4 events, 1 active check-in, full week in briefing")
print("  Conversations: personal thread (8 msgs) + household thread (6 msgs)")
