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

# ── 3b. Family members ────────────────────────────────────────────────────────
# Both adults need their OWN row (where profile_id == their auth id) so the
# dashboard's me = members.find(m => m.profile_id === user.id) lookup works
# for both demo logins. The kids are duplicated under each adult so each side
# of the household can read them via their own profile_id.
print("Seeding family members...")
def upsert_family_member(profile_id, name, member_type, age=None):
    existing = get("family_members", "name", name)
    existing = [e for e in existing if e.get("profile_id") == profile_id]
    if existing:
        print(f"  · {name} already in family for {profile_id} — skipping")
        return
    body = {"profile_id": profile_id, "name": name, "member_type": member_type}
    if age is not None:
        body["age"] = age
    insert("family_members", body)
    print(f"  + {name} ({member_type}) under {profile_id}")

# Jordan's view of the household
upsert_family_member(jordan_id, "Jordan Mitchell", "adult", 38)
upsert_family_member(jordan_id, "Sam Mitchell",    "adult", 39)
upsert_family_member(jordan_id, "Emma Mitchell",   "child",  8)
upsert_family_member(jordan_id, "Nora Mitchell",   "child",  2)

# Sam's view of the household (mirrored so partner@kinai.family also sees data)
upsert_family_member(sam_id, "Sam Mitchell",    "adult", 39)
upsert_family_member(sam_id, "Jordan Mitchell", "adult", 38)
upsert_family_member(sam_id, "Emma Mitchell",   "child",  8)
upsert_family_member(sam_id, "Nora Mitchell",   "child",  2)

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

# Dual-income tech household: daily standups, sprint cadence, design reviews,
# all-hands — layered against the family logistics that don't move (school
# pickup, daycare close at 5:45, kids' activities). The whole point of the
# product is making this overlay legible.
#
# Day offsets are relative to "today" — assumes Sat=today (offsets 0..6 cover
# this weekend through next Friday).
# Color legend — Jordan: #7AADCE blue, Sam: #D4748A rose, kid events: #7CB87A sage
JORDAN_C = "#7AADCE"
SAM_C    = "#D4748A"
KID_C    = "#7CB87A"

# Daycare closes 5:45 PM sharp. The 5:45 → 6:00 pickup is hard to miss
# because both parents' afternoon meetings tend to run long.
def standup(profile_id, day, color):
    return event(profile_id, "Standup", day, 9, 9, start_m=30, end_m=45, color=color)

def daycare_pickup(profile_id, day):
    return event(profile_id, "Nora — daycare pickup", day, 17, 18,
                 start_m=45, end_m=0, kid=True, member="Nora", color=KID_C,
                 desc="Daycare closes 5:45 sharp")

events = [
    # ── Sat (today) — weekend, family-led ───────────────────────────────────
    event(sam_id,    "Morning run",                0,  7,  8,                color=SAM_C),
    event(jordan_id, "Farmers market",             0,  9, 10,    shared=True,  color=JORDAN_C,
          desc="Grand Ave. Bring bags."),
    event(jordan_id, "Emma's soccer game",         0, 10, 12,    kid=True, member="Emma", color=KID_C,
          desc="Home — Riverside Park, field 3"),
    event(sam_id,    "Birthday party — Olive's",   0, 14, 16,    kid=True, member="Emma", color=KID_C,
          desc="Sam covers drop-off + pickup"),
    event(sam_id,    "Movie night",                0, 19, 21,    shared=True,  color=JORDAN_C),

    # ── Sun ─────────────────────────────────────────────────────────────────
    event(jordan_id, "Grocery run",                1,  8,  9,                color=JORDAN_C),
    event(jordan_id, "Emma's soccer practice",     1, 10, 11, end_m=30, kid=True, member="Emma", color=KID_C),
    event(sam_id,    "Brunch with Nadia",          1, 11, 13,                color=SAM_C),
    event(sam_id,    "Dinner — Patel family",      1, 19, 21,    shared=True,  color=SAM_C,
          desc="Their place — bring wine"),

    # ── Mon — work week begins ─────────────────────────────────────────────
    standup(jordan_id, 2, JORDAN_C),
    standup(sam_id,    2, SAM_C),
    event(sam_id,    "1:1 with manager",           2, 10, 11,                color=SAM_C),
    event(jordan_id, "Design review",              2, 14, 15,                color=JORDAN_C,
          desc="Q3 onboarding flow — 5 mocks to walk through"),
    event(jordan_id, "Emma — school pickup",       2, 15, 15, end_m=30, kid=True, member="Emma", color=KID_C),
    daycare_pickup(jordan_id, 2),
    event(sam_id,    "Book club",                  2, 18, 20, start_m=30,    color=SAM_C,
          desc="At Julia's — 'The God of Small Things'"),

    # ── Tue ─────────────────────────────────────────────────────────────────
    event(sam_id,    "Morning gym",                3,  7,  8,                color=SAM_C),
    standup(jordan_id, 3, JORDAN_C),
    standup(sam_id,    3, SAM_C),
    event(jordan_id, "Sprint planning",            3, 11, 12,                color=JORDAN_C,
          desc="2-week sprint kickoff"),
    event(jordan_id, "Nora — pediatrician (18mo)", 3, 14, 15,    kid=True, member="Nora", color=KID_C,
          desc="Dr. Patel — checkup + vaccines"),
    daycare_pickup(sam_id, 3),
    event(jordan_id, "Date night",                 3, 19, 21,    shared=True,  color=JORDAN_C,
          desc="Oleana, 7pm reservation"),

    # ── Wed ─────────────────────────────────────────────────────────────────
    standup(jordan_id, 4, JORDAN_C),
    standup(sam_id,    4, SAM_C),
    event(jordan_id, "All-hands",                  4, 10, 11,                color=JORDAN_C),
    event(sam_id,    "Lunch with Sarah",           4, 12, 13,                color=SAM_C),
    event(jordan_id, "Emma — soccer practice",     4, 16, 17,    kid=True, member="Emma", color=KID_C),
    daycare_pickup(sam_id, 4),

    # ── Thu ─────────────────────────────────────────────────────────────────
    standup(jordan_id, 5, JORDAN_C),
    standup(sam_id,    5, SAM_C),
    event(jordan_id, "Quarterly planning",         5, 13, 15,                color=JORDAN_C,
          desc="Cross-team — long one"),
    event(jordan_id, "Emma — school pickup",       5, 15, 15, end_m=30, kid=True, member="Emma", color=KID_C),
    event(sam_id,    "Happy hour — team",          5, 17, 19,                color=SAM_C),
    daycare_pickup(jordan_id, 5),
    event(jordan_id, "Dinner — Grandma's",         5, 18, 20,    shared=True,  color=JORDAN_C),

    # ── Fri ─────────────────────────────────────────────────────────────────
    standup(jordan_id, 6, JORDAN_C),
    standup(sam_id,    6, SAM_C),
    event(jordan_id, "Sprint demo",                6, 11, 12,                color=JORDAN_C),
    event(jordan_id, "Emma — soccer practice",     6, 15, 16, end_m=30, kid=True, member="Emma", color=KID_C),
    daycare_pickup(sam_id, 6),
]

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

# OPEN — RED standup conflict (Tuesday 9am — both parents in standup at the
# same time, but Nora's 18-mo pediatrician is at 2pm and someone needs to
# leave work early to make it)
upsert_issue({
    "household_id": jordan_id,
    "trigger_type": "schedule_conflict",
    "state": "OPEN",
    "severity": "RED",
    "content": "Tuesday 2pm pediatrician for Nora — neither of you has it on the work calendar yet. Jordan's sprint planning ends at noon, so the cleanest cover is Jordan leaving by 1:30. Confirm before EOD Monday.",
    "event_window_start": ts(3, 14, 0),
    "event_window_end": ts(3, 15, 0),
    "surfaced_at": ts(0, 8, 30),
})

# ACKNOWLEDGED — Monday book club lands during daycare pickup window
upsert_issue({
    "household_id": jordan_id,
    "trigger_type": "late_schedule_change",
    "state": "ACKNOWLEDGED",
    "severity": "YELLOW",
    "content": "Sam's book club moved to 6:30pm Monday — that's after the 5:45 daycare pickup, but Sam was supposed to handle it. Jordan to cover Nora's pickup Monday; Sam clears straight to book club.",
    "event_window_start": ts(2, 17, 45),
    "event_window_end": ts(2, 18, 30),
    "surfaced_at": ts(-1, 20, 0),
    "acknowledged_at": ts(-1, 21, 15),
})

# RESOLVED — yesterday's pickup risk (closed by the family)
upsert_issue({
    "household_id": jordan_id,
    "trigger_type": "pickup_risk",
    "state": "RESOLVED",
    "severity": "YELLOW",
    "content": "Sam's late afternoon meeting clipped Nora's 5:45 daycare pickup. Jordan stepped out of design review 15 minutes early to cover.",
    "event_window_start": ts(-1, 17, 45),
    "event_window_end": ts(-1, 18, 0),
    "surfaced_at": ts(-1, 10, 0),
    "acknowledged_at": ts(-1, 10, 45),
    "resolved_at": ts(-1, 18, 15),
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
    ("user",      "Hey — what does my work week actually look like?",                    ts(-2, 9,  0)),
    ("assistant", "Three load-bearing things: design review Monday 2pm (Q3 onboarding flow), sprint planning Tuesday at 11, all-hands Wednesday at 10. Quarterly planning Thursday 1–3pm is the long one. Standups every morning 9:30 — same as always.", ts(-2, 9,  1)),
    ("user",      "Anything weird with Nora's pickup this week?",                        ts(-2, 9,  5)),
    ("assistant", "Tuesday's the one to watch. Sam's covering daycare pickup at 5:45 and you've got date night at 7pm — tight but workable. The bigger pinch is Nora's 2pm pediatrician — neither of you has it on the work calendar yet. I'd confirm coverage tonight.",  ts(-2, 9,  6)),
    ("user",      "I'll take pediatrician — sprint planning ends at noon, I can leave by 1:30.", ts(-1, 14, 0)),
    ("assistant", "Logged. I'll block 1:30–3:30pm Tuesday on your calendar so nothing else slots in. Also — Sam's book club moved to Monday 6:30, so daycare pickup at 5:45 is on you Monday.",  ts(-1, 14, 1)),
    ("user",      "Got it. Thanks.",                                                     ts(-1, 14, 3)),
    ("assistant", "I'll keep an eye on it.",                                             ts(-1, 14, 3)),
]

# Household thread messages
household_msgs = [
    ("user",      "Sam moved book club to Monday 6:30. Does that wreck pickup?",         ts(-1, 19, 0)),
    ("assistant", "It moves it onto you. Nora's daycare pickup is 5:45 Monday — Sam was covering. If Sam's straight to book club at 6:30, you'd handle pickup and bedtime. Workable: Emma's school pickup is 3:30, Nora's at 5:45, design review wraps 3pm so you've got the window.", ts(-1, 19, 1)),
    ("user",      "Tuesday — is date night still safe?",                                 ts(-1, 19, 10)),
    ("assistant", "Tuesday evening is clear once Nora's pickup is handled. Sam's covering daycare at 5:45, which gets you both home by 6:15. Reservation's at Oleana 7pm — comfortable runway.",  ts(-1, 19, 11)),
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
        "content": "Emma's soccer game wraps noon — open afternoon until the birthday party at 2pm.",
        "prompt": "Want me to suggest something quick for lunch?",
        "dismissed": False,
        "check_in_date": datetime.now(timezone.utc).date().isoformat(),
    })
    insert("kin_check_ins", {
        "profile_id": jordan_id,
        "household_id": jordan_id,
        "content": "Tuesday's pediatrician is now on your calendar 1:30–3:30 — Sam confirmed.",
        "prompt": None,
        "dismissed": True,
        "check_in_date": datetime.now(timezone.utc).date().isoformat(),
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
    "Good morning, Jordan. Saturday — light day on paper, but the real one to "
    "plan around is the week ahead.\n\n"
    "Today: Farmers market 9am, Emma's home soccer game 10–12, then open until "
    "Sam takes Olive's birthday party at 2pm. Movie night 7pm.\n\n"
    "Heads up for the work week:\n"
    "  · Mon: Sam's book club moved to 6:30 — Nora's daycare pickup at 5:45 is "
    "now on you. Design review wraps 3pm so you've got the window.\n"
    "  · Tue: pediatrician for Nora 2pm — you said you'd cover. I've blocked "
    "1:30–3:30. Date night Oleana 7pm is locked.\n"
    "  · Wed: all-hands 10am, soccer practice 4pm with Emma.\n\n"
    "I've got eyes on the rest. Reply STOP to pause."
))
upsert_briefing(sam_id, (
    "Good morning, Sam. Saturday's calm — morning run 7am, then the rest is "
    "Jordan's lead.\n\n"
    "You've got Olive's birthday party with Emma 2–4pm (drop-off + pickup). "
    "Movie night at 7.\n\n"
    "Week ahead:\n"
    "  · Mon: book club 6:30 at Julia's. Jordan covers Nora's 5:45 daycare.\n"
    "  · Tue: 1:1 with manager 10am, daycare pickup 5:45 (you), then date "
    "night with Jordan at 7.\n"
    "  · Wed: lunch with Sarah 12pm, daycare pickup 5:45.\n\n"
    "Standups every morning 9:30 — same cadence as Jordan's."
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
