# Feature: AI Chat Companion

**Status:** `done`

## Purpose

Give the user a conversational AI that actually knows them — drawing on their journal chunks, check-in history, and past conversations to respond with genuine context rather than generic advice. The AI's role is to help them reflect, not to prescribe. It should feel like a warm, curious presence that has read everything they've written.

## User story

> As someone working on anxious attachment, I want to talk through what I'm experiencing with an AI that knows my patterns, so I can get reflection that's actually relevant to me — not a generic response.

---

## Flow

```
Drawer → AI
    │
    └─ AIScreen
         │
         ├─ loads most recent conversation (or creates one)
         │
         ├─ user types message → send
         │
         └─ Edge Function: chat-with-ai
                │
                ├─ embed user message
                ├─ retrieve top-k journal chunks by similarity
                ├─ load recent conversation history
                ├─ build prompt (system + context + history + message)
                ├─ call AI provider
                ├─ save user + assistant messages to Supabase
                └─ return response → display in chat
```

---

## UI / UX

### AIScreen

Accessible from the drawer as "AI". No header bar — full screen, immersive (same treatment as CalmDown/Reframe).

**Layout:**
- Scrollable message list, fills the screen, newest at the bottom
- User messages: right-aligned, teal bubble (`Colors.primary`), white text
- AI messages: left-aligned, white card bubble (`Colors.surface`), primary text
- Loading indicator (three dots or `ActivityIndicator`) shown while waiting for response
- Text input + send button pinned to the bottom, above the keyboard
- "New conversation" text link in the top-right corner

**Empty state (no messages yet):**
- Serif heading centered: "What's on your mind?"
- Muted subtext: "I've read your journal. I'm here."

**Conversation loading:**
On mount, fetch the most recent `ai_conversation` for the user. If none exists, a new one is created on the first message send.

---

## Data

### Manual Supabase setup (before implementation)

```sql
create table ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

alter table ai_conversations enable row level security;
create policy "users can only access their own conversations"
  on ai_conversations for all using (auth.uid() = user_id);

create table ai_messages (
  id                  uuid primary key default gen_random_uuid(),
  conversation_id     uuid references ai_conversations(id) on delete cascade not null,
  user_id             uuid references auth.users(id) on delete cascade not null,
  created_at          timestamptz default now() not null,
  role                text not null check (role in ('user', 'assistant')),
  content             text not null,
  retrieved_chunk_ids uuid[]  -- which journal chunks informed this response
);

alter table ai_messages enable row level security;
create policy "users can only access their own messages"
  on ai_messages for all using (auth.uid() = user_id);
```

### TypeScript types (`src/types.ts`)

```ts
export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
```

---

## Edge Function: `chat-with-ai`

### Location
```
supabase/functions/chat-with-ai/
  index.ts          # entry point
  ai.ts             # AIProvider interface + factory
  providers/
    gemini.ts       # Gemini chat implementation (default)
    claude.ts       # Claude implementation (add when Anthropic key available)
```

### Request payload (from the app)
```ts
{
  conversation_id: string | null;  // null = start new conversation
  message: string;
  user_id: string;
}
```

### Response
```ts
{
  conversation_id: string;
  response: string;
}
```

### Pipeline inside the function

1. If `conversation_id` is null, insert a new row into `ai_conversations` and use its id
2. Embed the user's message using the same `GoogleEmbeddingProvider` from the RAG pipeline
3. Call `match_journal_chunks` with the embedding — retrieve top 5 most relevant chunks
4. Load the last 10 messages from `ai_messages` for conversation history
5. Build the prompt (see below)
6. Call the AI provider
7. Insert user message and assistant response into `ai_messages` (with `retrieved_chunk_ids`)
8. Return `{ conversation_id, response }`

### Pluggable AI provider

```ts
interface AIProvider {
  readonly model: string;
  chat(
    messages: { role: "user" | "assistant"; content: string }[],
    systemPrompt: string
  ): Promise<string>;
}

function getAIProvider(): AIProvider {
  const provider = Deno.env.get("AI_PROVIDER") ?? "gemini";
  switch (provider) {
    case "gemini": return new GeminiAIProvider();
    // case "claude": return new ClaudeAIProvider();
    default: throw new Error(`Unknown AI_PROVIDER: ${provider}`);
  }
}
```

**Default:** `gemini-2.5-flash-lite` (free tier, same key already set up).
Switch to a better model by changing `AI_PROVIDER` + adding the relevant API key secret.

### System prompt

```
You are a compassionate companion for someone working on understanding their anxious attachment patterns.

Your role is to help them reflect — not to give advice, diagnose, or fix. Be warm, curious, and present. Ask one good question at a time. Validate before you explore.

Here is relevant context from this person's journal history — past moments that may connect to what they're sharing now:

{{retrieved_chunks}}

Use this context naturally. If something from their past is clearly relevant, you can gently reference it ("I remember you wrote about..."). Don't force connections that aren't there. If there's no relevant history yet, just be present with what they're sharing now.

Keep responses concise — 2-4 sentences unless they ask for more. You are not a therapist. If they seem to be in crisis, gently encourage them to reach out to a professional.
```

The retrieved chunks are formatted as:
```
[{{emotional_tone}} — {{arc_position}}]: "{{text}}"
```

---

## Navigation changes (`App.tsx`)

New `AppScreen` variant:
```ts
| { screen: "ai" }
```

`showHeader` returns false for `"ai"` — full screen immersive.

New drawer item: "AI", between "Journal" and "Analytics".

`activeDrawerItem` gains an `"AI"` case for `current.screen === "ai"`.

---

## Implementation notes

### Files to create
| File | Purpose |
|---|---|
| `src/screens/AIScreen.tsx` | Chat UI |
| `supabase/functions/chat-with-ai/index.ts` | Edge Function entry point |
| `supabase/functions/chat-with-ai/ai.ts` | AIProvider interface + factory |
| `supabase/functions/chat-with-ai/providers/gemini.ts` | Gemini chat provider |

### Files to modify
| File | Change |
|---|---|
| `App.tsx` | Add `ai` screen variant, drawer item, header exclusion |
| `src/types.ts` | Add `AIMessage` type |

### Shared embedding between functions
The `chat-with-ai` function needs to embed the user's message before retrieval. Copy `providers/google.ts` from `embed-journal-entry` into `chat-with-ai/providers/` — or extract it to a shared import once the pattern is proven.

### New environment variables
```
AI_PROVIDER     # "gemini" | "claude"  (default: "gemini")
```
`GOOGLE_AI_API_KEY` is already set — no new secrets needed for the Gemini default.

### "New conversation" button
Inserts a new row into `ai_conversations`, clears the local message state, and starts fresh. Previous conversation is preserved in Supabase but no longer loaded.

---

## Out of scope

- Conversation history list / switching between past conversations
- Streaming responses (non-streaming for now — wait for full response then display)
- Voice input
- AI-initiated prompts (e.g. "check in with me" push notifications)
- Claude provider implementation (add when Anthropic key is available)
- Surfacing AI from post check-in flow (can add later, same pattern as journal prompt)
