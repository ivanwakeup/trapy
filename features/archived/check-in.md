# Feature: Check-In

**Status:** `done`

## Purpose

Give users a structured way to log an emotionally activated moment in real time. The goal is to slow down the spiral by naming what's happening — the activation level, the trigger, the story the brain is running, and the urge to act.

## User story

> As someone feeling emotionally activated, I want to quickly log what I'm experiencing so that I can observe my patterns without acting on my urges.

## UI / UX

Single scrollable screen. All sections are visible at once — no pagination or steps.

**Sections (top to bottom):**

1. **Header** — "Check In" title + today's date
2. **Activation level** — 1–10 slider with a large number and a dynamic label (e.g. "Barely a blip", "Full spiral"). Label updates as the slider moves.
3. **Trigger tags** — Multi-select pill grid. Tap to select, tap again to deselect.
4. **Thoughts/story tags** — Same pill UI. Prompts: "What's the story your brain is running?"
5. **Urge tags** — Same pill UI. Prompts: "What's your urge right now?"
6. **Save button** — Saves entry to AsyncStorage, transitions to confirmation state.

**Confirmation state:** Replaces the form with a centered message ("Check-in saved. You noticed what was happening. That's the work.") and a "New check-in" button that resets the form.

**Empty selection is allowed** — user can save with just an activation level and no tags selected.

## Data

Entries saved to AsyncStorage key `"checkins"` as a prepended JSON array.

```ts
interface CheckInEntry {
  id: string;          // Date.now().toString()
  timestamp: string;   // ISO string
  activationLevel: number;   // 1–10, default 5
  triggers: string[];
  thoughts: string[];
  urges: string[];
}
```

## Implementation notes

- `src/screens/CheckInScreen.tsx` — main screen
- `src/components/TagSelector.tsx` — reusable multi-select pill component, takes `tags`, `selected`, and `onToggle` props
- `src/data/tags.ts` — source of truth for all tag lists and activation level labels
- Slider uses `@react-native-community/slider` (must be installed via `expo install`, not `npm install`)

## Out of scope

- Free-text notes
- Editing or deleting past entries
- Push notification reminders
- Cloud sync
