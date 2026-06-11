import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAIProvider } from "./ai.ts";
import { getPersona } from "./persona.ts";
import { GoogleEmbeddingProvider } from "./providers/google-embedding.ts";

interface RequestPayload {
  conversation_id: string | null;
  message: string;
  user_id: string;
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
    const persona = getPersona();
    const systemPrompt = persona.buildSystemPrompt(chunks ?? []);
    const ai = getAIProvider();
    const response = await ai.chat(messages, systemPrompt);

    // Save both messages
    const chunkIds = (chunks ?? []).map((c: { id: string }) => c.id);
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
