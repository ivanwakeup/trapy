# Feature: Journal

**Status:** `done`

## Purpose

Give users a space to write freely about what they're experiencing, beyond the structured tag-based check-in. Over time, these entries become the primary corpus for a RAG/agentic system — chunked, embedded, and used to build richer, personalized AI prompts.

## User story

> As a user who just logged a check-in, I want to write freely about what's going on so that I can process it in my own words — and so the app can understand me better over time.

---

## Flow

**Standalone access:**
```
Drawer → Journal → list of past entries
                       │
                   "New entry" button
                       │
                   JournalEditorScreen (new)
                       │
                   Save → back to list
```

**Post check-in prompt:**
```
ReflectScreen (1–4 path) → Save → prompt: "Want to write more about this?"
                                       │
                                  Yes → JournalEditorScreen (new, checkin_id pre-set)
                                  No  → Home

ReframeScreen (5–7 path) → Done → same prompt
```

The prompt is lightweight — two text links, not a full screen. It appears in place of the normal "you're done" transition.

---

## UI / UX

### JournalListScreen

Accessible from the drawer as "Journal".

- Header: "Journal" (serif, same treatment as Analytics)
- "New entry" button — top right, small teal text link (not a full button — keeps it low-pressure)
- Scrollable list of entries, newest first
- Each row: date (e.g. "Monday, June 4") + first ~80 chars of body, truncated with ellipsis
- Tap a row → JournalEditorScreen in edit mode
- Empty state: serif heading "Nothing yet." + light subtext "Writing is a good place to start."

### JournalEditorScreen

Full-screen writing experience. No header bar — immersive, same as CalmDown/Reframe.

- Date shown at top in small muted text
- Large, borderless `TextInput` below — multiline, autofocus, fills the available space
- Placeholder: "What's going on?"
- "Save" button pinned to the bottom (above keyboard) — primary teal, full width
- If navigating back with unsaved text: no confirmation prompt (keep it low-friction — losing a draft is acceptable)
- On save: Supabase insert/update → navigate back to list

---

## Data

### Supabase table

```sql
create table journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null,
  body        text not null default '',
  checkin_id  uuid references checkins(id) on delete set null
);

alter table journal_entries enable row level security;

create policy "users can only access their own journal entries"
  on journal_entries for all
  using (auth.uid() = user_id);
```

`checkin_id` links the entry to the check-in that prompted it (nullable — standalone entries have no link). This FK is what lets the RAG layer join structured check-in context (activation level, triggers, thoughts) with the free-form narrative.

`updated_at` is used later to know which embeddings are stale and need re-generation.

### TypeScript type (`src/types.ts`)

```ts
export interface JournalEntry {
  id: string;
  timestamp: string;    // from created_at
  updatedAt: string;    // from updated_at
  body: string;
  checkinId?: string;   // from checkin_id — present when created post-check-in
}
```

---

## Navigation changes (`App.tsx`)

Two new `AppScreen` variants:

```ts
| { screen: "journal" }
| { screen: "journal-editor"; entryId?: string; checkinId?: string }
// entryId present = edit existing; absent = new entry
// checkinId present = was created from a check-in prompt
```

Header shows for `"journal"` (title: "Journal"). Hidden for `"journal-editor"` (immersive).

New drawer item: "Journal", between "Home" and "Analytics".

### Post check-in prompt

`ReflectScreen` and `ReframeScreen` currently call `onSaved` / `onDone` which routes back to home. Instead, they surface a prompt UI (two text links inline) before navigating:

- In `ReflectScreen`: after successful Supabase insert, show prompt instead of immediately calling `onSaved(entry)`. The prompt passes `entry.id` as `checkinId` when the user chooses yes.
- In `ReframeScreen`: after the "Done" press on the final step, show prompt before calling `onDone()`.

---

## Implementation notes

### Files to create

| File | Purpose |
|---|---|
| `src/screens/JournalListScreen.tsx` | Entry list + empty state |
| `src/screens/JournalEditorScreen.tsx` | Full-screen text editor |

### Files to modify

| File | Change |
|---|---|
| `App.tsx` | Add `journal` and `journal-editor` screen variants; add Journal drawer item; wire header title; update `showHeader` |
| `src/types.ts` | Add `JournalEntry` type |
| `src/screens/ReflectScreen.tsx` | Add post-save prompt (pass `checkinId` to editor) |
| `src/screens/ReframeScreen.tsx` | Add post-done prompt |

### Editor save logic

- New entry: `supabase.from("journal_entries").insert({ user_id, body, checkin_id })`
- Edit: `supabase.from("journal_entries").update({ body, updated_at: new Date().toISOString() }).eq("id", entryId)`
- Disable save button while request is in flight

### List fetch

```ts
supabase
  .from("journal_entries")
  .select("id, created_at, updated_at, body, checkin_id")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false })
```

---

## RAG readiness (out of scope for this spec, recorded for future)

- Add `pgvector` extension to Supabase project
- Add `embedding vector(1536)` column to `journal_entries`
- Background job: chunk `body` by paragraph/sentence, generate embeddings via OpenAI or Claude, store in a `journal_chunks` table with `entry_id` FK
- At query time: embed the user's current context (check-in tags + activation level), cosine-similarity search over `journal_chunks`, inject top-k results into the Claude prompt

The `checkin_id` FK and `updated_at` column are already designed with this in mind.

---

## Out of scope

- Editing entries from the list (tap → read-only view is acceptable for now; edit mode can come later)
- Entry deletion
- Search / filtering
- Rich text / markdown formatting
- Embedding generation (next spec)
- Surfacing the post-check-in prompt from CalmDownScreen
