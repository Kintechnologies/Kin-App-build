# Spec: Chat E2E Verification — Task #7

**Author:** Product & Design Lead (automated)
**Date:** 2026-04-02
**Status:** Ready for QA
**Depends on:** Vercel deploy (#1), Anthropic API key in env

---

## User Story

As a parent, I want to ask Kin a question and get a fast, useful, personalized AI response so that I feel like I have a family chief of staff on call.

---

## Screen Flow

1. User navigates to `/chat` (via left nav "Chat" tab)
2. Initial loading state: 3-dot pulse animation while prior messages load from DB
3. Empty state (no prior messages): Kin avatar + "Hey, I'm Kin" headline + subtitle copy + quick reply chips
4. User taps a quick reply OR types a message and sends
5. User's message appears immediately in right-aligned bubble (primary green)
6. Typing indicator appears (3 animated dots with "Kin is thinking...")
7. Kin's response streams in (or appears as a complete message) in left-aligned bubble
8. If AI uses web search tool: response takes ~2–4s longer; no visual indication of search in progress (P3: add "Searching..." micro-state)
9. Message history persists — refresh page and all messages re-appear
10. Voice input: tap mic → recording indicator → speak → transcript appears in input box → send

---

## States to Verify

### Loading State
- [ ] 3-dot pulse animation shows while prior messages load from Supabase
- [ ] Animation uses primary green (#7CB87A) at 30% opacity — NOT white or gray
- [ ] Loading state disappears when messages load (even if message list is empty)

### Empty State
- [ ] Kin avatar (Sparkles icon, green shimmer) appears centered
- [ ] Headline: `Hey, I'm Kin` in Instrument Serif Italic
- [ ] Subtitle: `Your family's AI chief of staff. Ask me about meals, budget, scheduling — or just say hi.`
- [ ] 4 quick reply chips appear in 2×2 grid: "Plan my meals" (amber), "Budget check" (blue), "Date night ideas" (rose), "What should the kids eat today?" (blue)
- [ ] Mic prompt: `Tap the mic to talk to me` (shown only if SpeechRecognition is supported in browser)
- [ ] Quick reply chips disappear after any message is sent

### Active Conversation State
- [ ] User message: right-aligned, primary green background, `text-background` text
- [ ] Kin message: left-aligned, glass surface, `text-warm-white/90`
- [ ] Typing indicator appears between send and response
- [ ] Hover over Kin message: volume/speaker button appears (read aloud)
- [ ] Tapping speaker button reads message aloud; icon changes to VolumeX (stop)

### Error State
- [ ] If AI call fails (network error, 500): Kin's error message appears as a chat bubble (not a modal or page error)
- [ ] Error copy: `Sorry, something went wrong. Please try again.` (or similar)
- [ ] Input field remains usable after error — user can retry

### Persistence
- [ ] After sending 3+ messages, reload the page — all messages should reappear in order
- [ ] Messages tied to authenticated user (not leaked to other accounts)
- [ ] No duplicate messages on re-mount

---

## Interactions to Test

| Action | Expected |
|--------|----------|
| Send message via Enter key | Message sends |
| Send message via Send button | Message sends |
| Send while loading (button disabled) | No double-send |
| Tap quick reply chip | Message pre-filled and sent |
| Voice input (supported browser) | Transcript appears in input; user can edit before sending |
| Voice input (unsupported browser) | Mic button hidden — NOT shown in disabled state |
| Tap speaker icon on Kin message | Speech synthesis plays; icon switches to stop |
| Tap stop icon | Speech stops |

---

## Data Requirements

- Supabase `messages` table: `{ id, role, content, created_at, profile_id }`
- `POST /api/chat` — authenticated; sends `{ message: string }`, returns streamed or batched response
- `GET /api/chat` or initial Supabase fetch — loads prior messages on mount
- Anthropic API key set in Vercel env as `ANTHROPIC_API_KEY`
- Tavily API key set as `TAVILY_API_KEY` for web search tool (optional — degrades gracefully)

---

## Acceptance Criteria

- [ ] First message to Kin returns a coherent, personalized response in < 8 seconds
- [ ] Response references family context (names, dietary restrictions) from onboarding preferences
- [ ] Message history survives page reload
- [ ] No pure white text, no purple UI elements, no `bg-black` backgrounds anywhere on page
- [ ] Empty state uses Instrument Serif Italic for "Hey, I'm Kin" headline
- [ ] All quick reply chips use correct brand color tokens (amber, blue, rose — no purple)
- [ ] Error state shows user-facing message (not a raw API error)
- [ ] Voice input functional on Chrome/Safari desktop; mic button hidden on unsupported browsers
- [ ] Touch targets on mobile: Send button, mic button, speaker button all ≥ 44px

---

## Known Gaps / Future Work

- **P3:** "Searching..." micro-state while web_search tool runs (currently user sees full thinking delay without feedback)
- **P3:** Streaming response rendering (currently response appears all at once)
- **P3:** Message reactions or "this was helpful" thumb
- **P3:** Clear conversation history button
