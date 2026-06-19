import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAIProvider } from "./ai.ts";
import { getPersona } from "./persona.ts";
import { GoogleEmbeddingProvider } from "./providers/google-embedding.ts";

interface RequestPayload {
  conversation_id: string | null;
  message: string;
  user_id: string;
  persona?: string;
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
    const { conversation_id, message, user_id, persona: personaName }: RequestPayload = await req.json();

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

    // Extract keywords: proper nouns + words longer than 4 chars, skip stop words
    const stopWords = new Set(["about", "their", "there", "think", "would", "could", "should", "these", "those", "which", "where", "while", "after", "before", "since"]);
    const keywords = message
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w.toLowerCase()));

    const orFilter = keywords.map((w) => `text.ilike.%${w}%`).join(",");

    const [vectorResult, keywordResult] = await Promise.all([
      supabase.rpc("match_journal_chunks", {
        query_embedding: queryEmbedding,
        user_id_filter: user_id,
        match_count: 4,
      }),
      orFilter
        ? supabase
            .from("journal_chunks")
            .select("id, text, emotional_tone, arc_position, entry_date")
            .eq("user_id", user_id)
            .or(orFilter)
            .limit(3)
        : Promise.resolve({ data: [] }),
    ]);

    const vectorChunks = vectorResult.data ?? [];
    const vectorIds = new Set(vectorChunks.map((c: { id: string }) => c.id));
    const keywordChunks = (keywordResult.data ?? []).filter(
      (c: { id: string }) => !vectorIds.has(c.id)
    );
    const chunks = [...vectorChunks, ...keywordChunks];

    // Look up entry_ids for retrieved chunks and fetch full entry bodies,
    // in parallel with conversation history
    const chunkIds = chunks.map((c: { id: string }) => c.id);

    const [{ data: chunkMeta }, { data: history }] = await Promise.all([
      chunkIds.length > 0
        ? supabase.from("journal_chunks").select("id, entry_id").in("id", chunkIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from("ai_messages")
        .select("role, content")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(10),
    ]);

    const entryIdByChunkId = new Map(
      (chunkMeta ?? []).map((c: { id: string; entry_id: string }) => [c.id, c.entry_id])
    );

    const uniqueEntryIds = [
      ...new Set(
        chunks
          .map((c: { id: string }) => entryIdByChunkId.get(c.id))
          .filter(Boolean)
      ),
    ].slice(0, 3) as string[];

    const { data: fullEntries } = uniqueEntryIds.length > 0
      ? await supabase
          .from("journal_entries")
          .select("id, body")
          .in("id", uniqueEntryIds)
      : { data: [] };

    const bodyByEntryId = new Map(
      (fullEntries ?? []).map((e: { id: string; body: string }) => [e.id, e.body])
    );

    // Enrich chunks with full entry body, deduplicated by entry
    const seenEntryIds = new Set<string>();
    const enrichedChunks = chunks
      .map((c: any) => {
        const entryId = entryIdByChunkId.get(c.id);
        return { ...c, full_body: entryId ? bodyByEntryId.get(entryId) : undefined };
      })
      .filter((c: any) => {
        const entryId = entryIdByChunkId.get(c.id);
        if (!entryId) return true;
        if (seenEntryIds.has(entryId)) return false;
        seenEntryIds.add(entryId);
        return true;
      });

    const messages = [
      ...(history ?? []),
      { role: "user" as const, content: message },
    ];

    // Build prompt and call AI
    const persona = getPersona(personaName);
    const systemPrompt = persona.buildSystemPrompt(enrichedChunks);
    console.log(`[prompt] persona: ${persona.name}\n---\n${systemPrompt}\n---`);
    const ai = getAIProvider();
    const response = await ai.chat(messages, systemPrompt);

    // Save both messages
    const retrievedChunkIds = chunks.map((c: { id: string }) => c.id);
    await supabase.from("ai_messages").insert([
      { conversation_id: convId, user_id, role: "user", content: message },
      {
        conversation_id: convId,
        user_id,
        role: "assistant",
        content: response,
        retrieved_chunk_ids: retrievedChunkIds,
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
