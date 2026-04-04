# Scheduler Setup — Assembly Line v1.1
**Date:** 2026-04-03
**Author:** CoS Coordinator
**Action required:** Austin — run these from a normal (non-scheduled) Cowork session

The assembly line requires 3 changes and 1 new task. Scheduled tasks can only be created/updated from a normal session, not from inside a running scheduled task. Open a fresh Cowork chat and ask Claude to execute the following.

---

## 1. Create — Intelligence Engineer (NEW)

**Say to Claude:**
> "Create a scheduled task with ID `kin-intelligence-engineer`, description 'Intelligence Engineer — Owns Kin's AI behavior layer: system prompts, spec compliance, drift prevention', cron `0 0,2,4,6,8,10,12,14,16,18,20,22 * * *`, and use the prompt in `docs/prompts/AGENT-PROMPT-intelligence-engineer.md`"

---

## 2. Update — Lead Engineer timing fix

**Current cron:** `0 0,2,4,6,8,10,12,14,16,18,20,22 * * *` (fires at :00 — same time as P&D, no handoff gap)
**New cron:** `30 0,2,4,6,8,10,12,14,16,18,20,22 * * *` (fires at :30 — after P&D + IE have had 30 min)

**Say to Claude:**
> "Update scheduled task `kin-lead-engineer`: change cron to `30 0,2,4,6,8,10,12,14,16,18,20,22 * * *` and replace the prompt with the contents of `docs/prompts/AGENT-PROMPT-lead-engineer.md`"

---

## 3. Update — Product & Design prompt

**Cron stays the same** (`0 0,2,4,...`). Only the prompt changes.

**Say to Claude:**
> "Update scheduled task `kin-product-design`: replace the prompt with the contents of `docs/prompts/AGENT-PROMPT-product-design.md`"

---

## 4. Update — QA prompt

**Cron stays the same** (`0 1,3,5,...`). Only the prompt changes.

**Say to Claude:**
> "Update scheduled task `kin-qa-audit`: replace the prompt with the contents of `docs/prompts/AGENT-PROMPT-qa.md`"

---

## 5. Update — CoS Coordinator timing + prompt

**Current cron:** `0 1,3,5,7,9,11,13,15,17,19,21,23 * * *` (fires at odd hour :00 — same time as QA)
**New cron:** `20 1,3,5,7,9,11,13,15,17,19,21,23 * * *` (fires at :20 — after QA has had 20 min)

**Say to Claude:**
> "Update scheduled task `kin-cos-coordinator`: change cron to `20 1,3,5,7,9,11,13,15,17,19,21,23 * * *` and replace the prompt with the contents of `docs/prompts/AGENT-PROMPT-cos-coordinator.md`"

---

## After all 5 steps, the assembly line looks like this:

```
Even hour :00  →  Product & Design + Intelligence Engineer  (parallel)
Even hour :30  →  Lead Engineer                             (builds on their outputs)
Odd hour  :00  →  QA & Standards                           (audits the build)
Odd hour  :20  →  CoS Coordinator                          (updates sprint board)
```

Every 2 hours: specs → build → audit → coordinate.

---

## Verify the setup

After making the changes, ask Claude to run `list_scheduled_tasks` and confirm:
- `kin-intelligence-engineer` exists and is enabled
- `kin-lead-engineer` cron shows `:30` (not `:00`)
- `kin-cos-coordinator` cron shows `:20` (not `:00`)
- `kin-product-design` and `kin-qa-audit` are unchanged in timing

---

_— CoS Coordinator, 2026-04-03_
