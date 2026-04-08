# Settings Screen — Component Spec
**Version:** 1.1
**Author:** Product & Design
**Date:** 2026-04-04
**Status:** APPROVED — updated post-QA Run H
**Component:** `apps/mobile/app/(tabs)/settings.tsx`

**Changelog v1.0 → v1.1:**
- **P2-22 (QA Run H):** Added Family Members card documentation to §7 Account section
- **P2-NOTED resolved:** `cardTitle` font updated to Geist SemiBold (intentional design — better hierarchy than Regular; QA deferred to P&D judgment in run H)
- **P2-NOTED resolved:** `pageTitle` color updated to `c.green` (consistent with Today screen `index.tsx` page header; P&D accepted in staging review run AI)
- **Spec accuracy corrections:** Updated numeric values across §2, §3, §4, §5 to match built implementation (these were minor authoring errors in v1.0 — borderRadius, gap, letterSpacing, margin, and shadow property corrections); removed non-existent `shadowGreen` shadow — card uses `borderWidth: 1, borderColor: c.surfaceSubtle` instead

---

## Overview

Settings is the third tab in the 3-tab v0 architecture. It handles account management, integrations, app preferences, referrals, and legal/support links. It does not contain navigation to any retired domain tabs (meals, budget, fitness, family). Those domains are data sources for the intelligence engine only.

The Settings screen is functional-first — it does not use Instrument Serif. All typography is Geist. The screen should feel organized and clean, not complex.

---

## 1. Screen Container

| Property | Value |
|----------|-------|
| Background | `c.background` (`#0C0F0A`) |
| Safe area | Top and bottom |
| Layout | `ScrollView`, vertical, no indicator |
| Content padding horizontal | 16px |
| Content padding top | 8px |
| Content padding bottom | 40px |

**No FloatingOrbs** on Settings — ambient orbs are reserved for Today and Conversations (emotional/conversational surfaces). Settings is functional.

---

## 2. Page Title

| Property | Value |
|----------|-------|
| Text | "Settings" |
| Font | Instrument Serif Italic, 28px, `c.green` |
| Margin top | 8px |
| Margin bottom | 24px |

**Note on color:** Page title uses `c.green` (not `c.textPrimary`), consistent with Today screen (`index.tsx`) page header treatment. This is the accepted design pattern for primary screen titles across the 3-tab architecture. Padding comes from the parent scroll content container (`paddingHorizontal: 20`).

---

## 3. Section Labels

Used as dividers between setting groups.

| Property | Value |
|----------|-------|
| Font | Geist Mono Regular, 11px, `c.textDim` |
| Letter spacing | 2 |
| Text transform | uppercase |
| Margin left | 4px |
| Margin top | 20px |
| Margin bottom | 10px |

---

## 4. Card Container (reused across all settings rows)

| Property | Value |
|----------|-------|
| Background | `c.surfacePrimary` |
| Border radius | 18px |
| Padding | 16px |
| Margin bottom | 8px |
| Border width | 1px |
| Border color | `c.surfaceSubtle` |

**Card row layout:** horizontal flex, aligned center, gap 14px. Left: icon orb (40×40px, radius 14px). Center: text block (flex: 1). Right: badge, chevron, or switch.

**Note on shadow:** Cards use a 1px `c.surfaceSubtle` border for definition, not a native shadow — this is correct and intentional for the near-black background.

---

## 5. Icon Orb

Each card row has a 40×40px rounded icon container.

| Property | Value |
|----------|-------|
| Size | 40×40px |
| Border radius | 14px |
| Icon size | 20px |

Icon orb background and icon color pair by domain:

| Context | Orb background | Icon color |
|---------|---------------|------------|
| Account / general | `c.greenSubtle` | `c.green` |
| Calendar / Appearance / Haptics | `c.blueSubtle` | `c.blue` |
| Notifications / Meals / Budget | `c.amberSubtle` | `c.amber` |
| Privacy / Terms / Help / Contact | `c.surfaceSubtle` | `c.textMuted` |
| Family Members | `c.roseSubtle` | `c.rose` |
| Voice Responses | `c.greenSubtle` | `c.green` |
| Referral | `c.amberSubtle` | `c.amber` |
| Subscription (tier-dependent) | `tierBg` | `tierColor` |

---

## 6. Card Typography

| Element | Font | Size | Color |
|---------|------|------|-------|
| Card title | Geist SemiBold | 15px | `c.textPrimary` |
| Card subtitle | Geist Regular | 13px | `c.textMuted` |

**Note on cardTitle weight:** Geist SemiBold (not Regular) was the implemented and accepted choice. SemiBold provides the visual hierarchy contrast needed against `c.textMuted` subtitles on a near-black card surface. Any future settings card introduced must use Geist SemiBold for the title.

**Note on cardSubtitle color:** `c.textMuted` (40% opacity warm white) — not `c.textSecondary` (75%). Settings subtitles are supporting context, not primary information.

---

## 7. Section: Account

### Profile Card

- Icon: `User`, green orb
- Title: `formatFamilyName(profile.family_name)` — e.g., "The Ford Family"
- Subtitle: user email address
- Right: `ChevronRight`, 16px, `c.textFaint`
- Not yet tappable in v0 — placeholder for future profile editing

### Family Members Card

- Icon: `Users`, rose orb (`c.roseSubtle` background, `c.rose` icon)
- Title: "Family Members"
- Subtitle: "Manage profiles and invite partner"
- Right: `ChevronRight`, 16px, `c.textFaint`
- **Not tappable in v0** — placeholder card, no `onPress` handler. Renders as a visual placeholder for a future profiles/partner management flow. Partner linking in v0 happens via the Conversations screen invite prompt, not here.

---

### Subscription Card

Tappable — opens `PaywallModal` on press.

| Tier | Title | Title color | Orb bg | Icon |
|------|-------|-------------|--------|------|
| `free` | "Free Trial" | `c.textSecondary` | `c.surfaceSubtle` | `Sparkles` |
| `starter` | "Starter Plan" | `c.green` | `c.greenSubtle` | `Sparkles` |
| `family` | "Family Plan" | `c.amber` | `c.amberSubtle` | `Crown` |

**Subtitle variants:**

- `free` + `trial_ends_at` present: "{N} days left in trial — tap to upgrade"
- `free` + no trial: "Start your 7-day free trial"
- Non-free: "Manage subscription"

Right chevron color: `c.textFaint` for free; `tierColor` for paid tiers.

**Haptic:** Light impact on press.

---

## 8. Section: Integrations

### Calendar Sync Card

- Icon: `Calendar`, blue orb
- Title: "Calendar Sync"
- Subtitle: "Connect Google or Apple Calendar"
- Right: Badge pill ("Not connected")

**Badge pill:**

| Property | Value |
|----------|-------|
| Background | `c.surfaceSubtle` |
| Text | "Not connected" |
| Font | Geist Mono Regular, 10px, `c.textFaint` |
| Border radius | 20px |
| Padding | 4px horizontal, 6px vertical |

When connected in future releases: badge changes to "Connected" with green background (`c.greenSubtle`, `c.greenMuted` text).

---

## 9. Section: Preferences

Five toggle cards. All use the same `Switch` component styling.

**Switch styling:**

| Property | Value |
|----------|-------|
| Track color (off) | `c.skeletonBase` |
| Track color (on) | `c.greenDim` |
| Thumb color (on) | `c.green` |
| Thumb color (off) | `c.textMuted` |
| Haptic on toggle | Light impact |

### Appearance Card

- Icon: Moon / Sun / Monitor depending on current theme (blue orb)
- Title: "Appearance"
- Subtitle: current theme label ("System" / "Light" / "Dark")
- Right: theme chip selector (3 chips: "Auto", "Light", "Dark")

**Theme chips:**

| Property | Value |
|----------|-------|
| Chip font | Geist Regular, 11px |
| Inactive color | `c.textFaint` |
| Inactive bg | `c.surfaceSubtle` |
| Active color | `c.textPrimary` |
| Active bg | `c.surfacePrimary` |
| Active border | 1px `rgba(240, 237, 230, 0.12)` |
| Border radius | 6px |
| Padding | 4px horizontal, 3px vertical |

### Notifications Card

- Icon: `Bell` (on) or `BellOff` (off), amber orb
- Title: "Notifications"
- Subtitle: "Push notifications"
- Right: Switch

### Meal Reminders Card

- Icon: `Sparkles`, amber orb
- Title: "Meal Reminders"
- Subtitle: "Daily meal prep nudges"
- Right: Switch

**Note:** Meal Reminders remains in v0 Settings even though the Meals tab is retired. This controls whether Kin surfaces meal-related reminders through the intelligence engine (Today screen / notifications).

### Budget Alerts Card

- Icon: `CreditCard`, amber orb
- Title: "Budget Alerts"
- Subtitle: "Notify at 90% of budget"
- Right: Switch

**Note:** Same as above — budget data feeds the intelligence engine; this preference controls whether budget alerts surface.

### Voice Responses Card

- Icon: `Volume2`, green orb
- Title: "Voice Responses"
- Subtitle: "Read Kin's responses aloud"
- Right: Switch

### Haptic Feedback Card

- Icon: `Smartphone`, blue orb
- Title: "Haptic Feedback"
- Subtitle: "Vibration on interactions"
- Right: Switch

---

## 10. Section: Earn

### Refer a Family Card

Tappable — future referral flow (not yet wired in v0).

- Icon: `Gift`, amber orb
- Title: "Refer a Family" — color: `c.amber`
- Subtitle: "Share Kin, earn free months"
- Right: `ChevronRight`, 16px, `c.amber`
- Card has a subtle amber-tinted background (`c.amberSubtle` border or surface overlay — see `styles.referralCard`)

---

## 11. Section: About

Four info cards, all using the muted icon orb (`c.surfaceSubtle`, `c.textMuted`). Right chevron: `c.textFaint`. None are tappable yet in v0 — placeholders for future routing.

| Row | Icon | Title | Subtitle |
|-----|------|-------|----------|
| Privacy Policy | `Shield` | "Privacy Policy" | — |
| Terms of Service | `FileText` | "Terms of Service" | — |
| Help & Support | `HelpCircle` | "Help & Support" | — |
| Contact Us | `Mail` | "Contact Us" | "hello@kinai.family" |

---

## 12. Sign Out Button

Standalone action below the About section.

| Property | Value |
|----------|-------|
| Layout | Row, centered, gap 8px |
| Margin top | 8px |
| Icon | `LogOut`, 16px, `c.textMuted` |
| Text | "Sign Out" |
| Font | Geist Regular, 15px, `c.textMuted` |
| Pressed state | `opacity: 0.70` |
| Action | Calls `supabase.auth.signOut()` → navigates to onboarding |
| Haptic | Not applicable (destructive action, no haptic reinforcement) |

---

## 13. Version Text

| Property | Value |
|----------|-------|
| Text | "Kin v1.0.0" |
| Font | Geist Mono Regular, 12px, `c.textFaint` |
| Text align | center |
| Margin top | 16px |

---

## 14. PaywallModal Integration

Settings imports and renders `<PaywallModal>` directly. Modal is shown/hidden via `showPaywall` state. On `onSuccess`, settings re-fetches the user profile to refresh the subscription tier badge.

See `docs/specs/paywall-modal-spec.md` for PaywallModal visual spec.

---

## 15. All States

| State | Behavior |
|-------|----------|
| Loading | Profile fetches on mount. Cards render with placeholder values if profile hasn't loaded — no visible skeleton (profile load is fast). |
| Signed out / no user | `user` is null → profile fields show empty. Should not occur in normal flow (auth gates the app). |
| Free trial expired | `trial_ends_at` in past + tier = `free` → shows "0 days left" — design handles this gracefully (no special error state). |
| Calendar not connected | Badge shows "Not connected" — this is the v0 default. Connected state is a future release. |

---

## 16. Spec Compliance Checklist (for QA)

- [ ] No domain tab navigation (no links to meals/budget/fitness/family screens)
- [ ] Account section renders 3 cards in order: Profile → Family Members → Subscription
- [ ] Family Members card: rose orb (`c.roseSubtle` / `c.rose`), `Users` icon, `ChevronRight`, not tappable (no crash on tap)
- [ ] Subscription card correctly renders all 3 tier states (free / starter / family)
- [ ] Calendar badge uses neutral styling: `c.surfaceSubtle` background, `c.textFaint` text, border-radius 20px (not rose colors)
- [ ] Sign out button: no haptic feedback fires on press
- [ ] Appearance theme chips respond to tap and update system theme
- [ ] All 5 preference toggles use correct Switch styling (`c.greenDim` track when on)
- [ ] Sign Out works and clears auth session
- [ ] Referral card visible but not yet wired (no crash on tap)
- [ ] No purple in any element
- [ ] PaywallModal opens from Subscription card tap and closes on `onClose`
