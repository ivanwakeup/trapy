# Feature: Home Screen Redesign — Card Dashboard

**Status:** `done`

## Purpose

Replace the single-purpose activation slider screen with a card-based dashboard that gives the user multiple entry points at a glance. The home screen should feel like a personal space that invites engagement rather than a single-question form.

## User story

> As someone opening the app, I want to see a clear overview of what I can do and how I've been doing, so I can quickly act on what's most relevant in this moment — whether that's logging how I feel, reading an insight, or chatting with the AI.

---

## UI / UX

### Layout

Scrollable vertical list of cards, no header title (just a greeting). Cards are visually distinct — same dark surface as the current card style, slightly more generous spacing than today.

**Top of screen:**
- Greeting text: "Good morning, Ivan." (or afternoon/evening based on time of day)
- Muted subtext: today's date

**Cards (in order):**

---

#### 1. Check-In Card

Label: **"Feeling activated?"**
Subtext: "Rate where you are right now."

Contains the activation slider inline (1–10, same as current `HomeScreen`). The activation label updates as the user drags (`ACTIVATION_LABELS[value]`).

A **"Check in"** button at the bottom of the card. Tapping it routes the user through the existing flow (`routeFromActivation(level)`) — exactly the same logic as today, just initiated from the card rather than a standalone screen.

The slider and button are always visible — no tap-to-expand behavior.

---

#### 2. Recent Insight Card

Label: **"Your patterns"**
Subtext: "Based on your recent check-ins."

Shows one stat pulled from the user's check-in history:
- Most frequent trigger (e.g. "Unread messages is your most common trigger")
- OR most common activation band (e.g. "You've been in the 4–6 range most often this week")
- Falls back to "No check-ins yet — your patterns will appear here." if no data

Tapping anywhere on the card navigates to the Analytics screen.

---

#### 3. Journal Card

Label: **"Your journal"**
Subtext: most recent entry date, or "No entries yet."

If entries exist: shows the first ~80 characters of the most recent entry body as a preview, truncated with ellipsis.

Tapping navigates to the Journal list screen.

A **"New entry"** link/button in the top-right corner of the card navigates directly to the journal editor.

---

#### 4. AI Card

Label: **"Talk it through"**
Subtext: "Your AI companion is ready."

Static — no live data pulled. Just an invitation. Tapping navigates to the AI chat screen.

---

### Empty / loading state

Each card handles its own loading and empty state independently. Cards that need data (Insight, Journal) show a muted placeholder while fetching — no full-screen spinner.

---

## Data

No new tables or types needed. Each card reads from existing sources:

| Card | Source |
|---|---|
| Check-In | Local state (slider), routes via existing `routeFromActivation` |
| Insight | `checkins` table — one lightweight query for recent entries |
| Journal | `journal_entries` table — fetch most recent 1 entry |
| AI | No data needed |

---

## Implementation notes

### Files to create
| File | Purpose |
|---|---|
| `src/screens/HomeScreen.tsx` | Full rewrite — card layout replaces the current slider-only screen |
| `src/components/CheckInCard.tsx` | Activation slider card (extracted component) |
| `src/components/InsightCard.tsx` | Pattern insight card |
| `src/components/JournalCard.tsx` | Journal preview card |
| `src/components/AICard.tsx` | AI entry-point card |

### Files to modify
| File | Change |
|---|---|
| `App.tsx` | No routing changes needed — all existing routes stay the same |

### Props for HomeScreen

```ts
interface Props {
  onContinue: (level: number) => void;        // existing — routes check-in
  onNavigate: (screen: AppScreen) => void;    // new — navigates to analytics/journal/ai
}
```

`onNavigate` lets each card drive the app to a different screen without `HomeScreen` knowing about the nav state machine directly. Pass `setCurrent` from `App.tsx`.

### Greeting logic

```ts
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
```

### Insight card stat

Query the last 30 days of check-ins and find the most frequent trigger using a simple frequency count in JS — no new SQL function needed. If fewer than 3 check-ins exist, show the fallback copy instead.

### Card visual style

Same as current `Shadow.card` + `Colors.surface` background. Cards have a small label in `Fonts.sansSemiBold` at top-left and a muted subtext line below. Content sits below with a thin divider (`Colors.divider`) separating header from body.

---

## Out of scope

- Reordering or hiding cards (user customization)
- Notification badges or unread counts on cards
- Pinned or sticky cards
- Any new data sources beyond what already exists
- Pull-to-refresh (each card fetches on mount)
