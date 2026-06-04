# Feature: Reflection

**Status:** `done`

## Purpose

After a check-in, offer the user a gentle moment of cognitive reframing — asking if they're open to considering an alternative explanation for their distress. The goal is not to dismiss what they're feeling, but to create a small opening for curiosity. The tone throughout is soft and permission-giving, never corrective.

## User story

> As someone who just logged a moment of activation, I want to be gently invited to consider another possibility so that I can build tolerance for ambiguity without feeling pushed or invalidated.

## UI / UX

The reflection screen appears immediately after the user taps "Save check-in" — it replaces the current full-screen confirmation. The form does not reappear until the user taps Done.

---

### Step 1 — Openness check

The screen shows:

- A subtle "Saved ✓" indicator at the top (small, muted — not the focus)
- A short context line summarizing what was logged, e.g. "You're at a **7** right now." (activation level only — not a list of tags)
- The core question: **"Would it feel ok to consider another possibility?"**
- Two equal-weight buttons: **"Yes, I'm open"** and **"Not right now"**

No pressure language. The buttons look visually equivalent — neither is primary.

---

### Step 2a — Reframe (if open)

Replaces the openness check with:

- A personalized reframe prompt (see Personalization Logic below)
- Framed as a question or gentle observation, not a correction
- A **Done** button

---

### Step 2b — Grounding note (if not now)

Replaces the openness check with:

- A single short note, e.g. *"That's ok. You don't have to figure it out right now."*
- A **Done** button

---

### Done

Tapping Done on either Step 2 state resets to a fresh check-in screen.

---

## Personalization logic

Personalization is rule-based now, with the architecture designed to be replaced by an AI/chatbot call later (which will have full journal + check-in history as context).

**Priority order:**
1. If a thought tag is selected → use the thought-to-reframe map (highest signal)
2. Else if a trigger tag is selected → use the trigger-to-reframe map
3. Else → fall back to an activation-level-appropriate generic reframe

**Activation level modifier:**
- Level 8–10: Lead with validation before the reframe. E.g. *"That sounds really intense. When you're ready..."*
- Level 1–4: Can go straight to the reframe question

**Thought → reframe map (initial set):**

| Thought tag | Reframe prompt |
|---|---|
| They're losing interest | "Is it possible they're just distracted or going through something of their own right now?" |
| I did something wrong | "What would you need to see to actually know that — rather than just feel it?" |
| I'm too much | "Is 'too much' a fact, or a fear? What's the difference here?" |
| They found someone better | "What evidence do you actually have for that, versus what your brain filled in?" |
| I'm going to be abandoned | "That fear makes sense given what you've been through. Is there anything in this specific situation that makes it different from past ones?" |
| I'm not good enough | "Not good enough by whose measure? Is that voice yours, or did you inherit it?" |
| They're angry at me | "Is it possible they're feeling something that has nothing to do with you?" |
| I'm overreacting | "You're not overreacting — you're activated. Those aren't the same thing. What does the situation actually call for?" |
| This is going to end | "Can you sit with not knowing how this ends, just for right now?" |
| They don't actually care | "What's one thing they've done that doesn't fit that story?" |
| I pushed them away | "What did you actually do, versus what you're afraid you did?" |
| They were never really into me | "What would you need to see to feel more certain either way — and is that information available right now?" |

**Generic fallbacks by activation band:**

- 1–4: "Is there a version of this where nothing is wrong yet?"
- 5–7: "What's the most boring, undramatic explanation for what's happening?"
- 8–10: "That sounds really hard. When you're ready — is there one small thing that doesn't quite fit the story your brain is telling?"

If multiple thought tags are selected, pick the one that appears first in the `THOUGHTS` array in `src/data/tags.ts` (i.e. highest priority in the defined order).

---

## Data

Extend `CheckInEntry` in AsyncStorage to include an optional `reflection` field:

```ts
interface Reflection {
  openToReframe: boolean;
  reframeOffered?: string;   // the prompt text shown, if openToReframe is true
}

interface CheckInEntry {
  id: string;
  timestamp: string;
  activationLevel: number;
  triggers: string[];
  thoughts: string[];
  urges: string[];
  reflection?: Reflection;   // added — undefined if user skips reflection somehow
}
```

The reflection is written to AsyncStorage when the user taps Done (not when they answer the openness question).

---

## Implementation notes

- **New screen:** `src/screens/ReflectionScreen.tsx`
- **New data file:** `src/data/reframes.ts` — exports the thought→reframe map, trigger→reframe map, and fallback array. Keeping it separate from `tags.ts` makes it easy to swap for an AI call later.
- **Flow change in `CheckInScreen.tsx`:** On save, instead of setting `saved = true` (which shows the current confirmation), pass the completed entry up to `App.tsx` which then renders `ReflectionScreen` with the entry as a prop.
- **`App.tsx` change:** Add a `pendingReflection` state that holds the just-saved entry. When set, render `ReflectionScreen` instead of `CheckInScreen`. On Done, clear `pendingReflection`.
- The reframe selection logic lives in `src/data/reframes.ts` as a pure function `selectReframe(entry: CheckInEntry): string` — easy to replace with an async AI call later without touching the UI.

## Future state (AI / chatbot)

The `selectReframe` function signature is designed to be swappable. In the future it will:
- Accept the full check-in history alongside the current entry
- Make an async call to a Claude-backed endpoint
- Return a dynamically generated reframe informed by the user's patterns over time

The UI layer does not need to change for this — only `selectReframe` is replaced.

## Out of scope

- Free-text response from the user to the reframe
- Multiple reframe questions per session
- Skipping the reflection screen entirely (it always appears after save)
- User-configurable reframe preferences
- AI integration (this spec covers the rule-based foundation only)
