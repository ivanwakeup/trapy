# Feature: Analytics

**Status:** `done`

## Purpose

Show the user aggregate patterns across their check-ins so they can start to recognize what consistently triggers them, what stories their brain runs, and what urges come up most — without having to re-read every entry.

## User story

> As someone who has been logging check-ins, I want to see patterns in my data so that I can recognize my triggers and responses without having to re-read every entry.

## UI / UX

Single scrollable screen, accessible via the hamburger drawer.

**Sections (top to bottom):**

1. **Header** — "Analytics" title
2. **Summary stat cards** — Three cards in a row:
   - Total check-ins
   - Average activation level (1 decimal place)
   - Peak activation level
3. **Activation over time** — Bar chart of the last 14 check-ins, ordered oldest → newest. Each bar's height is proportional to the activation level (out of 10). Bar labels show the raw number below.
4. **Top triggers** — Ranked list of up to 5 most frequent trigger tags. Each row shows the tag label, a proportional bar, and a count.
5. **Top thoughts** — Same format as triggers.
6. **Top urges** — Same format as triggers.

**Empty state:** If no check-ins exist, shows a centered message prompting the user to complete their first check-in.

**Loading state:** Shows an `ActivityIndicator` while AsyncStorage is being read.

**Refresh behavior:** Data reloads whenever the screen comes into focus (controlled via a `focused` prop passed from `App.tsx`).

## Data

Read-only. Reads from the same `"checkins"` AsyncStorage key as the check-in feature. No writes.

## Implementation notes

- `src/screens/AnalyticsScreen.tsx` — main screen
- Accepts a `focused: boolean` prop; `useEffect` triggers a reload when `focused` changes to `true`. This replaces `useFocusEffect` from React Navigation (which was removed from the project).
- Bar charts and ranked lists are built with plain `View` + `flex` — no charting library.
- `topN(items, n)` utility function counts tag frequency and returns the top N sorted descending.

## Out of scope

- Filtering by date range
- Exporting data
- Per-entry drill-down
- Trend lines or moving averages

