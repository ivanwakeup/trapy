# Feature: Navigation Restructure

**Status:** `done`

## Purpose

The current app treats every check-in the same regardless of how activated the user is. A person at a 2 and a person at a 9 have fundamentally different needs — one can reflect, the other needs to regulate first. This restructure routes users to the right experience based on their activation level, and gives the app a proper home base.

## Full flow

```
Home (activation slider)
    │
    ├─ 1–4 ──────────────────→ Reflect → save → Home
    │
    ├─ 5–7 ──────────────────→ Choice screen
    │                               ├─ "Yes, let's look at it" → Reflect → Reframe → Home
    │                               └─ "I need to settle first" → Calm Down → Home
    │
    └─ 8–10 ─────────────────→ Calm Down → Home
```

---

## Screens

### 1. Home screen (NEW)

The landing screen of the app. Extensible card-based layout — for now, a single card containing the activation slider.

**UI:**
- App name / greeting at the top ("trapy", or a soft welcome line)
- A card with the activation slider (same 1–10 + dynamic label as current check-in screen)
- A single CTA button: "Continue"
- On Continue: reads the slider value and routes accordingly

**Routing logic:**
| Activation | Route |
|---|---|
| 1–4 | Reflect screen |
| 5–7 | Choice screen |
| 8–10 | Calm Down screen |

---

### 2. Choice screen (NEW — replaces the 5–7 path)

Appears only at activation 5–7. Tone matches the current ReflectionScreen — curious, non-pushy, soft permission-giving language. The goal is to help the user notice whether they're ready to reflect or still need to regulate.

**UI:**
- Subtle context line: "You're at a [X] right now."
- A curiosity-inviting question, e.g.:
  > "Does it feel ok to sit with what's happening and explore it a little?"
- Two equal-weight buttons:
  - **"Yes, let's look at it"** → Reflect screen
  - **"I need to settle first"** → Calm Down screen
- No pressure framing — buttons are visually equal, no primary/secondary distinction

---

### 3. Reflect screen (RENAMED from Check-In)

Same as current CheckInScreen — triggers, thoughts, urges tags. Accessible from both the 1–4 path and the 5–7 → "Yes" path.

**Changes from current:**
- Renamed from "Check In" to "Reflect"
- After saving:
  - If reached via 1–4 path → save and return to Home (no Reframe screen)
  - If reached via 5–7 path → save and proceed to Reframe screen
- The screen needs to know which path it came from (pass a prop: `showReframeAfter: boolean`)

---

### 4. Reframe screen (RENAMED from ReflectionScreen)

The current "Would it feel ok to consider another possibility?" screen. Now only appears after the `5–7 → Reflect` path. Unchanged in structure and tone.

**Changes from current:**
- No longer appears after the 1–4 Reflect path
- Renamed internally to `ReframeScreen`
- On Done → return to Home

---

### 5. Calm Down screen (NEW)

Appears for 8–10 activation directly, or when the user chooses "I need to settle first" at 5–7. Offers two tools in sequence: box breathing, then grounding.

**UI — two phases, user advances manually:**

**Phase 1: Box breathing**
- Title: "Let's slow things down"
- Brief instruction: "Breathe with the box. Each side is 4 counts."
- Animated breathing guide (expand/hold/contract/hold cycle) — simple View animation, no library
- 4-count inhale → 4-count hold → 4-count exhale → 4-count hold, repeating
- Visual: a square or circle that expands and contracts with the breath
- Label below changes with each phase: "Breathe in" / "Hold" / "Breathe out" / "Hold"
- A "I feel a little more settled" button appears after at least 3 full cycles
  
**Phase 2: Grounding (5-4-3-2-1)**
- Title: "Let's ground you here"
- Works through 5 senses in sequence, one at a time:
  1. "Name 5 things you can **see**"
  2. "Name 4 things you can **hear**"
  3. "Name 3 things you can **touch** or feel"
  4. "Name 2 things you can **smell**"
  5. "Name 1 thing you can **taste**"
- Each prompt shown one at a time, user taps "Next" to advance
- No text input — the act of mentally naming is enough
- After the 5th sense → a closing note: "Good. You're here." + a "Done" button

**After Done → return to Home**

No data is saved for Calm Down sessions (no entry written to AsyncStorage).

---

## Navigation state in App.tsx

Replace `pendingReflection` with a proper navigation state machine:

```ts
type AppScreen =
  | { screen: "home" }
  | { screen: "choice"; activationLevel: number }
  | { screen: "reflect"; activationLevel: number; showReframeAfter: boolean }
  | { screen: "reframe"; entry: CheckInEntry }
  | { screen: "calmdown" };
```

App.tsx holds `currentScreen: AppScreen` and renders accordingly. The header shows/hides and its title updates based on `currentScreen`.

---

## File changes

| File | Change |
|---|---|
| `src/screens/HomeScreen.tsx` | NEW |
| `src/screens/ChoiceScreen.tsx` | NEW |
| `src/screens/CalmDownScreen.tsx` | NEW |
| `src/screens/ReflectScreen.tsx` | RENAMED from CheckInScreen, add `showReframeAfter` prop |
| `src/screens/ReframeScreen.tsx` | RENAMED from ReflectionScreen |
| `src/screens/CheckInScreen.tsx` | DELETE |
| `src/screens/ReflectionScreen.tsx` | DELETE |
| `App.tsx` | Replace `pendingReflection` with `AppScreen` state machine |

---

## Drawer navigation

The hamburger drawer currently lists "Check In" and "Analytics". Update to:
- **Home** (replaces Check In)
- **Analytics**

Navigating via the drawer always goes to `{ screen: "home" }`, resetting any in-progress flow.

---

## Out of scope

- Saving Calm Down sessions to AsyncStorage
- Letting users revisit the Choice screen after choosing a path
- Notification-triggered flows
- Persisting the user's last activation level across sessions
