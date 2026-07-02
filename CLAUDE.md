@AGENTS.md

# trapy

An iOS journaling app for anxious attachment — helps users recognize triggers, build ambiguity tolerance, and observe patterns over time.

## Stack

- **Expo SDK 54** with React Native 0.81.5 and React 19
- **TypeScript** throughout
- **Supabase** for auth (email OTP), check-ins, journal entries, relationships, and AI conversations
- **Claude Haiku (`claude-haiku-4-5-20251001`)** for journal entry chunking/analysis
- **Voyage AI (`voyage-3`, 1024-dim)** for embeddings (vector search in AI chat)
- **Claude (Anthropic)** for AI chat responses
- Entry point: `index.ts` → `App.tsx`

## Project structure

```
App.tsx                          # Root: state machine nav, drawer, font loading
index.ts                         # Registers root component
src/
  types.ts                       # Shared types: CheckInEntry, Reflection
  theme.ts                       # Colors, Fonts, Shadow — single source of truth
  data/
    tags.ts                      # Tag lists (triggers, thoughts, urges) + activation labels
    reframes.ts                  # selectReframe(entry) — rule-based reframe logic
    relationships.ts             # RELATIONSHIP_TYPES array + Relationship interface
  lib/
    supabase.ts                  # Supabase client singleton
    AuthContext.tsx              # React Context + useAuth() hook
  components/
    TagSelector.tsx              # Reusable multi-select pill component
    ThemeBubble.tsx              # Circular bubble with glow-on-hover (used in ThemeCloud)
    ThemeCloud.tsx               # Circle-packed bubble chart of journal themes
    ToneColors.ts                # emotional_tone → hex color + label mapping
    ToneHeatmap.tsx              # GitHub-style calendar heatmap, colored by dominant tone per day
    ToneRiver.tsx                # Stacked bar chart of tone mix per week, horizontally scrollable
    AICard.tsx                   # Home screen card for AI chat entry point
    InsightCard.tsx              # Home screen insight card
    Card.tsx                     # Generic pressable card
  screens/
    AuthScreen.tsx               # Email + 8-digit OTP sign-in UI
    HomeScreen.tsx               # Date-navigable home; green + button starts check-in
    CheckInScreen.tsx            # Full check-in flow: relationship picker, activation, tags, journal text
    OnboardingScreen.tsx         # Shown on first launch (no relationships); creates first relationship
    RelationshipsScreen.tsx      # Lists + edits relationships ("My People")
    JournalEditorScreen.tsx      # Full-screen journal editor; opened from analytics entry cards
    ChoiceScreen.tsx             # 5–7 path: curiosity-based routing question
    ReflectScreen.tsx            # Tag-based reflection (triggers, thoughts, urges)
    ReframeScreen.tsx            # "Consider another possibility" — 5–7 path only
    CalmDownScreen.tsx           # Box breathing + 5-4-3-2-1 grounding
    AnalyticsScreen.tsx          # ThemeCloud + ToneHeatmap + ToneRiver visualizations
supabase/
  functions/
    embed-journal-entry/         # Webhook-triggered chunking + embedding pipeline
      prompts/
        chunking.txt             # ← EDIT THIS to change the chunking prompt (uses {{BODY}} and {{CHECKIN_CONTEXT}})
      analyzers/
        types.ts                 # Analyzer<TInput, TOutput> interface for future agents
        chunking.ts              # ChunkingAnalyzer — reads prompt, calls Claude, returns Chunk[]
      providers/
        claude.ts                # Generic callClaude(prompt) — no domain logic
        voyage.ts                # VoyageEmbeddingProvider — embeds chunk text
      chunker.ts                 # getChunkingProvider() — wires ChunkingAnalyzer
      embedder.ts                # getEmbeddingProvider() — wires VoyageEmbeddingProvider
      index.ts                   # Webhook handler: chunks → embeds → inserts journal_chunks
    chat-with-ai/                # RAG-based AI chat (Voyage for query embedding, Claude for response)
scripts/
  import-journal.mjs             # Bulk import from .txt file; --wipe clears existing data; fixes out-of-order years
  chunk-entries.mjs              # Backfill: chunks all un-chunked entries via Claude (embedding: null)
  backfill-people.mjs            # Backfill: extracts people from existing chunks via Claude
  reembed-failed.mjs             # Re-triggers webhook for entries with no chunks
```

## Navigation — state machine

Navigation is a state machine in `App.tsx` with no external library. The `AppScreen` union type drives what renders.

```ts
type AppScreen =
  | { screen: "home" }
  | { screen: "analytics" }
  | { screen: "onboarding" }
  | { screen: "checkin"; date: Date }
  | { screen: "relationships" }
  | { screen: "journal-editor"; entryId?: string; checkinId?: string }
  | { screen: "choice"; activationLevel: number }
  | { screen: "reflect"; activationLevel: number; showReframeAfter: boolean }
  | { screen: "reframe"; entry: CheckInEntry }
  | { screen: "calmdown" };
```

On mount, `App.tsx` checks whether the user has any relationships. If none → `onboarding` screen. Journal editor is only reachable from `AnalyticsScreen` (via bubble or heatmap cell press).

## Data model (Supabase)

All data lives in Supabase. Key tables:

- **`checkins`** — activation level, triggers, thoughts, urges, optional `relationship_id`
- **`journal_entries`** — free-text body, optional `checkin_id`, `people: text[]`
- **`journal_chunks`** — chunked + analyzed segments: `text`, `emotional_tone`, `themes[]`, `arc_position`, `people[]`, `embedding vector(1024)`, `embedding_model`, `entry_date`
- **`relationships`** — name, relationship_type, notes; per-user with RLS
- **`ai_conversations`** / **`ai_messages`** — chat history

A journal entry is created as part of a check-in (no separate journal screen). The `checkin_id` on `journal_entries` links them.

## AI pipeline — chunking + embedding

**Trigger**: INSERT or UPDATE on `journal_entries` fires a Supabase Database Webhook → `embed-journal-entry` edge function.

**Chunking** (`analyzers/chunking.ts`):
- Reads `prompts/chunking.txt` (template with `{{BODY}}` and `{{CHECKIN_CONTEXT}}` placeholders)
- Calls Claude Haiku; parses JSON array of `Chunk` objects
- Each chunk has: `text`, `emotional_tone`, `themes[]`, `arc_position`, `people[]`

**Embedding** (`providers/voyage.ts`):
- Calls Voyage AI `voyage-3` model (1024-dim)
- Stored in `journal_chunks.embedding vector(1024)`
- `embedding` column allows NULL — `chunk-entries.mjs` backfill script sets it null intentionally

**Adding a new analyzer**: create `analyzers/<name>.ts` implementing `Analyzer<TInput, TOutput>` from `analyzers/types.ts`, add a prompt to `prompts/<name>.txt`, call it from `index.ts` after the chunking pass.

## Analytics visualizations

`AnalyticsScreen` has three visualizations, all reading from `journal_chunks`:

- **ThemeCloud** — circle-packed bubbles, sized by theme frequency; tap to see entries
- **ToneHeatmap** — GitHub-style calendar grid going back to the oldest entry; colored by dominant `emotional_tone` per day; tap cell → highlights all same-tone cells + shows entry navigation bar
- **ToneRiver** — horizontally scrollable stacked bar chart; one bar per week, segments proportional to tone mix

Tone → color mapping lives in `src/components/ToneColors.ts`. Edit there to change colors.

Both ToneHeatmap and ToneRiver compute their week range dynamically from the oldest chunk in the data — no hardcoded range.

## Scripts

```bash
# Import journal from .txt file (YYYY-MM-DD date headers, one entry per date)
SUPABASE_SERVICE_ROLE_KEY=<key> SUPABASE_USER_ID=<uid> node scripts/import-journal.mjs [file.txt]
# --wipe   deletes all existing journal_entries + journal_chunks first
# --dry-run  preview only

# Chunk all un-chunked entries through Claude (leaves embedding null)
SUPABASE_SERVICE_ROLE_KEY=<key> SUPABASE_USER_ID=<uid> node scripts/chunk-entries.mjs
# --force  re-chunks even entries that already have chunks
```

`chunk-entries.mjs` paginates the `journal_chunks` table in pages of 1000 to avoid Supabase's default row limit when checking which entries already have chunks.

`import-journal.mjs` automatically fixes out-of-order years: if an entry's year is less than the previous entry's year, it advances the year until the date is chronologically after. Month and day are never changed.

## Key decisions & gotchas

**No babel.config.js** — Do not add one. Expo SDK 54 manages its own Babel pipeline. Adding one (especially with a mismatched `babel-preset-expo` version) causes a Hermes `SyntaxError: private properties are not supported` at runtime.

**No Reanimated, no gesture handler, no React Navigation** — All removed due to `private properties are not supported` errors in Expo Go. Navigation is a plain React state machine; the drawer uses `Animated` from core React Native.

**Use `expo install` for native packages** — Always `npx expo install <package>`, not `npm install`. Ensures correct SDK-compatible version.

**`embed-journal-entry` deployed with `--no-verify-jwt`** — The Supabase Database Webhook (pg_net) doesn't send auth headers, so the function must be deployed without JWT verification: `supabase functions deploy embed-journal-entry --no-verify-jwt`.

**Voyage AI replaces Gemini for embeddings** — `journal_chunks.embedding` is `vector(1024)` (Voyage `voyage-3`). The old Gemini `gemini-embedding-001` was 768-dim. `match_journal_chunks` RPC expects 1024-dim input. `VOYAGE_API_KEY` is set as a Supabase secret.

**Supabase default row limit is 1000** — Any query that might return more than 1000 rows needs explicit pagination (`.range(from, from + PAGE - 1)` in a loop). This burned us in `chunk-entries.mjs` — entries appeared unchunked because the chunk ID set was truncated.

**Supabase OTP is 8 digits** — Supabase now sends 8-digit codes, not 6. The input, validation guard, and email template must all use 8. Editing Supabase email templates requires custom SMTP — use Resend (free tier, smtp.resend.com port 587, username `resend`, password is your Resend API key).

**journal_entries updates trigger the webhook** — Any UPDATE to a `journal_entries` row (even updating `people[]`) fires the embed webhook and re-chunks the entry. Scripts that update `journal_entries` after inserting chunks will cause an overwrite loop. Avoid updating `journal_entries` from within `chunk-entries.mjs`.

**Hover effects** — Components use `Pressable` with `hovered` state (works on web/pointer devices) + `pressed` for mobile. Web-only styles (CSS `transition`, `cursor`, `boxShadow`) are wrapped in `Platform.select({ web: [...], default: [] })`.

## Running the app

```bash
npx expo start          # Start dev server
npx expo start --clear  # Clear Metro cache (use after dependency changes)
```

Open in Expo Go on device by scanning the QR code. Expo Go version 1017756 (SDK 54) confirmed working.
