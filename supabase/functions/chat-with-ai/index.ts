import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAIProvider } from "./ai.ts";
import { GoogleEmbeddingProvider } from "./providers/google-embedding.ts";

interface RequestPayload {
  conversation_id: string | null;
  message: string;
  user_id: string;
}

interface JournalChunk {
  id: string;
  text: string;
  emotional_tone: string;
  arc_position: string;
}

function buildSystemPrompt(chunks: JournalChunk[]): string {
  const chunkContext = chunks.length > 0
    ? chunks
        .map((c) => `[${c.emotional_tone} — ${c.arc_position}]: "${c.text}"`)
        .join("\n\n")
    : "No relevant journal history found yet.";

  return `You are a compassionate companion for someone working on understanding their anxious attachment patterns.

Your role is to help them reflect — not to give advice, diagnose, or fix. Be warm, curious, and present. Ask one good question at a time. Validate before you explore.

Here is relevant context from this person's journal history — past moments that may connect to what they're sharing now:

${chunkContext}

Use this context naturally. If something from their past is clearly relevant, you can gently reference it ("I remember you wrote about..."). Don't force connections that aren't there. If there's no relevant history yet, just be present with what they're sharing now.

Keep responses concise — 2-4 sentences unless they ask for more. You are not a therapist. If they seem to be in crisis, gently encourage them to reach out to a professional.`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { conversation_id, message, user_id }: RequestPayload = await req.json();

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Empty message" }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create conversation if needed
    let convId = conversation_id;
    if (!convId) {
      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({ user_id })
        .select("id")
        .single();
      if (error) throw error;
      convId = data.id;
    }

    // Embed user message and retrieve relevant journal chunks
    const embedder = new GoogleEmbeddingProvider();
    const queryEmbedding = await embedder.embed(message);

    const { data: chunks } = await supabase.rpc("match_journal_chunks", {
      query_embedding: queryEmbedding,
      user_id_filter: user_id,
      match_count: 5,
    });

    // Load recent conversation history
    const { data: history } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(10);

    const messages = [
      ...(history ?? []),
      { role: "user" as const, content: message },
    ];

    // Build prompt and call AI
    const systemPrompt = buildSystemPrompt(chunks ?? []);
    const ai = getAIProvider();
    const response = await ai.chat(messages, systemPrompt);

    // Save both messages
    const chunkIds = (chunks ?? []).map((c: JournalChunk) => c.id);
    await supabase.from("ai_messages").insert([
      { conversation_id: convId, user_id, role: "user", content: message },
      {
        conversation_id: convId,
        user_id,
        role: "assistant",
        content: response,
        retrieved_chunk_ids: chunkIds,
      },
    ]);

    return new Response(
      JSON.stringify({ conversation_id: convId, response }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("chat-with-ai error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
