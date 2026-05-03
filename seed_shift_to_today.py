"""Shift seeded demo data forward so it aligns with today.
Original seed used 2026-04-04 as day 0. This script shifts all rows for the
demo household forward by (today - 2026-04-04) days. Safe to run repeatedly:
each run computes the new offset relative to the *current* min(start_time)
in the database.
"""

import requests, sys
from datetime import date, datetime, timezone, timedelta

SUPABASE_URL = "https://coxqdpcffmsncvisfyvj.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveHFkcGNmZm1zbmN2aXNmeXZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI3ODc1MCwiZXhwIjoyMDg5ODU0NzUwfQ.FrbCtBxkfq08K7LtzmxUK1qp2AnBnxz2fPw99yFNKjE"

H = {
    "Authorization": f"Bearer {KEY}",
    "apikey": KEY,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

JORDAN_ID = "a94cbe64-e03f-4a3b-8cd5-a3e0f4742eda"

def get(path):
    r = requests.get(f"{SUPABASE_URL}{path}", headers=H)
    r.raise_for_status()
    return r.json()

def patch(path, body):
    r = requests.patch(f"{SUPABASE_URL}{path}", headers=H, json=body)
    if not r.ok:
        print(f"ERROR {r.status_code} on PATCH {path}: {r.text}")
        sys.exit(1)
    return r.json()

def shift_iso(iso, delta):
    if not iso:
        return None
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return (dt + delta).isoformat()

# Find the earliest start_time among the household's events; align that to "today"
events = get(f"/rest/v1/calendar_events?household_id=eq.{JORDAN_ID}&select=id,start_time,end_time&order=start_time.asc&limit=1")
if not events:
    print("No events found — nothing to shift.")
    sys.exit(0)

earliest = datetime.fromisoformat(events[0]["start_time"].replace("Z", "+00:00"))
today_midnight_utc = datetime.combine(date.today(), datetime.min.time(), tzinfo=timezone.utc)
delta = today_midnight_utc - datetime.combine(earliest.date(), datetime.min.time(), tzinfo=timezone.utc)

print(f"Earliest event date: {earliest.date()}")
print(f"Today: {date.today()}")
print(f"Shifting by {delta.days} days...")

if delta.days == 0:
    print("Already aligned to today — nothing to do.")
    sys.exit(0)

# ── Calendar events ───────────────────────────────────────────────────────────
all_events = get(f"/rest/v1/calendar_events?household_id=eq.{JORDAN_ID}&select=id,start_time,end_time")
print(f"Shifting {len(all_events)} calendar_events...")
for e in all_events:
    patch(
        f"/rest/v1/calendar_events?id=eq.{e['id']}",
        {
            "start_time": shift_iso(e["start_time"], delta),
            "end_time":   shift_iso(e["end_time"],   delta),
        },
    )

# ── Coordination issues ───────────────────────────────────────────────────────
issues = get(f"/rest/v1/coordination_issues?household_id=eq.{JORDAN_ID}&select=*")
print(f"Shifting {len(issues)} coordination_issues...")
for i in issues:
    body = {}
    for col in ("event_window_start", "event_window_end", "surfaced_at", "acknowledged_at", "resolved_at"):
        if i.get(col):
            body[col] = shift_iso(i[col], delta)
    if body:
        patch(f"/rest/v1/coordination_issues?id=eq.{i['id']}", body)

print("\n✅ Demo data shifted forward.")
