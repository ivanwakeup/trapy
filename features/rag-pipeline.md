# Feature: RAG Pipeline — Chunking & Embedding

**Status:** `done`

## Purpose

Build the data layer that makes the AI "know" the user. Journal entries are processed by an LLM that segments them into emotionally coherent chunks, each of which is then embedded and stored as a vector. Over time this corpus enables retrieval-augmented generation — pulling the most contextually relevant moments from the user's history into any future AI prompt.

---

## Pipeline overview

```
journal_entries INSERT/UPDATE
        │
        ▼
  Edge Function triggered
        │
        ├─ fetch check-in context (if checkin_id set)
        │
        ├─ ChunkingProvider.chunk(entry, checkin?)
        │     LLM segments the entry by emotional arc
        │     returns: [{text, emotional_tone, themes, arc_position}]
        │
        ├─ delete existing chunks for this entry_id
        │
        └─ for each chunk:
              EmbeddingProvider.embed(chunk.text)
              insert into journal_chunks with vector
```

Triggered automatically via **Supabase Database Webhook** on `journal_entries` INSERT and UPDATE.

---

## Pluggable provider architecture

Both the chunking LLM and the embedding model are selected by environment variable. Adding a new provider = implementing one interface and adding a case to the factory. No other code changes.

### Embedding interface

```ts
interface EmbeddingProvider {
  readonly model: string;       // stored on each chunk row for provenance
  readonly dimensions: number;  // must match the vector column definition
  embed(text: string): Promise<number[]>;
}
```

### Chunking interface

```ts
interface Chunk {
  text: string;
  emotional_tone: string;
  themes: string[];
  arc_position: "onset" | "escalation" | "peak" | "de-escalation" | "resolution" | "reflection";
}

interface ChunkingProvider {
  readonly model: string;
  chunk(entry: JournalEntry, checkin?: CheckIn): Promise<Chunk[]>;
}
```

### Provider factories

```ts
function getEmbeddingProvider(): EmbeddingProvider {
  switch (Deno.env.get("EMBEDDING_PROVIDER") ?? "google") {
    case "google":  return new GoogleEmbeddingProvider();
    case "openai":  return new OpenAIEmbeddingProvider();
    case "voyage":  return new VoyageEmbeddingProvider();
    default: throw new Error("Unknown EMBEDDING_PROVIDER");
  }
}

function getChunkingProvider(): ChunkingProvider {
  switch (Deno.env.get("CHUNKING_PROVIDER") ?? "claude") {
    case "claude":  return new ClaudeChunkingProvider();
    case "openai":  return new OpenAIChunkingProvider();
    default: throw new Error("Unknown CHUNKING_PROVIDER");
  }
}
```

### Default providers

| Role | Default | Env var |
|---|---|---|
| Chunking | Gemini (`gemini-2.5-flash-lite`, free tier) | `CHUNKING_PROVIDER=gemini` |
| Embedding | Google `gemini-embedding-001` (768 dims) | `EMBEDDING_PROVIDER=google` |

### Switching providers

The `embedding_model` column on each chunk records which model generated it. When you switch embedding providers:

1. Update `EMBEDDING_PROVIDER` env var in Supabase
2. If the new model has different dimensions, run: `alter table journal_chunks alter column embedding type vector(<new_dims>)`
3. Run the re-embed job (a separate Edge Function that reprocesses chunks where `embedding_model != current_model`)

Switching chunking providers only affects future entries — existing chunks are not affected.

---

## Chunking strategy

The goal is not to chunk by token count or paragraph break, but by **emotional arc**. Each chunk should be a coherent unit of emotional experience — a moment the user could describe as "when I felt X about Y."

### Why emotional arc chunking

- Fixed-size chunking loses context across sentence boundaries
- Paragraph chunking doesn't map to emotional state shifts in free-form writing
- Emotional chunks retrieve semantically: "find moments when this user felt abandoned" returns chunks about the *experience*, not just keyword matches

### Chunking LLM prompt

```
You are analyzing a personal journal entry written by someone working on anxious attachment patterns.

Segment this entry into emotionally coherent chunks. Each chunk is a distinct beat — a moment where the emotional state, perspective, or self-awareness meaningfully shifts.

{{if checkin}}
Context from their check-in before writing:
- Activation level: {{activation_level}}/10 ({{activation_label}})
- Triggers they identified: {{triggers}}
- Thoughts running: {{thoughts}}
- Urges they felt: {{urges}}
{{/if}}

Journal entry:
{{body}}

Return a JSON array only. Each element:
{
  "text": "<exact text — do not paraphrase>",
  "emotional_tone": "<single word: e.g. anxious, settled, avoidant, curious, overwhelmed>",
  "themes": ["<1–3 themes: e.g. abandonment fear, waiting, physical sensation, reassurance seeking>"],
  "arc_position": "<onset | escalation | peak | de-escalation | resolution | reflection>"
}

Rules:
- Each chunk: 1–5 sentences
- Start a new chunk when emotional tone or perspective meaningfully shifts
- Preserve exact text — never summarize or rephrase
- If the entry is under 3 sentences, return a single chunk
- Return only the JSON array
```

---

## Data

### Manual Supabase setup (before implementation)

```sql
-- 1. Enable pgvector
create extension if not exists vector;

-- 2. Chunks table
create table journal_chunks (
  id             uuid primary key default gen_random_uuid(),
  entry_id       uuid references journal_entries(id) on delete cascade not null,
  user_id        uuid references auth.users(id) on delete cascade not null,
  created_at     timestamptz default now() not null,
  chunk_index    int not null,
  text           text not null,
  emotional_tone text,
  themes         text[],
  arc_position   text,
  embedding      vector(768),        -- Google text-embedding-004 default; alter if switching providers
  embedding_model text not null      -- e.g. "text-embedding-004", "text-embedding-3-small"
);

-- 3. RLS
alter table journal_chunks enable row level security;

create policy "users can only access their own chunks"
  on journal_chunks for all
  using (auth.uid() = user_id);

-- 4. Vector similarity index (build after initial data load)
create index on journal_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 5. Retrieval function
create or replace function match_journal_chunks(
  query_embedding vector(768),
  user_id_filter  uuid,
  match_count     int default 5
)
returns table (
  id             uuid,
  entry_id       uuid,
  text           text,
  emotional_tone text,
  themes         text[],
  arc_position   text,
  similarity     float
)
language sql stable
as $$
  select
    id,
    entry_id,
    text,
    emotional_tone,
    themes,
    arc_position,
    1 - (embedding <=> query_embedding) as similarity
  from journal_chunks
  where user_id = user_id_filter
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

---

## Edge Function structure

```
supabase/
  functions/
    embed-journal-entry/
      index.ts          # entry point — receives webhook payload, orchestrates pipeline
      chunker.ts        # ChunkingProvider interface + factory
      embedder.ts       # EmbeddingProvider interface + factory
      providers/
        claude.ts       # Claude chunking implementation
        google.ts       # Google AI Studio embedding implementation
        openai.ts       # OpenAI chunking + embedding implementations (future)
        voyage.ts       # Voyage embedding implementation (future)
```

### Environment variables (set in Supabase dashboard → Edge Functions → Secrets)

```
ANTHROPIC_API_KEY       # Claude (chunking)
GOOGLE_AI_API_KEY       # Google AI Studio (default embedding)
EMBEDDING_PROVIDER      # "google" | "openai" | "voyage"  (default: "google")
CHUNKING_PROVIDER       # "claude" | "openai"              (default: "claude")
SUPABASE_URL            # auto-injected by Supabase
SUPABASE_SERVICE_ROLE_KEY  # auto-injected by Supabase
```

### Webhook trigger (set in Supabase dashboard → Database → Webhooks)

- Table: `journal_entries`
- Events: INSERT, UPDATE
- URL: `{SUPABASE_URL}/functions/v1/embed-journal-entry`

---

## Retrieval (for future AI prompt building)

When building an AI prompt that uses user history, call `match_journal_chunks` with an embedded query derived from the current context:

```ts
// Example: embed the current check-in and retrieve relevant past moments
const queryText = `activation ${activationLevel}, triggers: ${triggers.join(", ")}, thoughts: ${thoughts.join(", ")}`;
const queryEmbedding = await embeddingProvider.embed(queryText);

const { data: chunks } = await supabase.rpc("match_journal_chunks", {
  query_embedding: queryEmbedding,
  user_id_filter: user.id,
  match_count: 5,
});

// chunks are the most emotionally relevant moments from the user's history
// inject into the AI system prompt
```

The retrieval function and query strategy are finalized in the AI integration spec (next).

---

## Out of scope

- Re-embed job (for provider switches) — noted above, spec separately when needed
- Embedding check-in data directly (check-ins are already structured; they serve as context for chunk retrieval via the `checkin_id` FK, not as a separate embedding corpus)
- The AI chat interface that uses retrieved chunks — next spec
- Chunk deletion UI
- Monitoring / embedding failure alerts
