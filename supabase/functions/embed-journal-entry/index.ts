import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getChunkingProvider, CheckInContext } from "./chunker.ts";
import { getEmbeddingProvider } from "./embedder.ts";

interface WebhookPayload {
  type: "INSERT" | "UPDATE";
  table: string;
  record: {
    id: string;
    user_id: string;
    body: string;
    checkin_id: string | null;
    created_at: string;
  };
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    const entry = payload.record;

    if (!entry.body?.trim()) {
      return new Response("Empty body — skipping", { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch check-in context if this entry was created from a check-in
    let checkin: CheckInContext | undefined;
    if (entry.checkin_id) {
      const { data } = await supabase
        .from("checkins")
        .select("activation_level, triggers, thoughts, urges")
        .eq("id", entry.checkin_id)
        .single();
      if (data) checkin = data;
    }

    const chunker = getChunkingProvider();
    const embedder = getEmbeddingProvider();

    const chunks = await chunker.chunk(entry.body, checkin);

    // Delete existing chunks for this entry (handles updates)
    await supabase.from("journal_chunks").delete().eq("entry_id", entry.id);

    // Embed and insert each chunk
    const rows = await Promise.all(
      chunks.map(async (chunk, index) => {
        const embedding = await embedder.embed(chunk.text);
        return {
          entry_id: entry.id,
          user_id: entry.user_id,
          chunk_index: index,
          text: chunk.text,
          emotional_tone: chunk.emotional_tone,
          themes: chunk.themes,
          arc_position: chunk.arc_position,
          embedding: JSON.stringify(embedding),
          embedding_model: embedder.model,
          entry_date: entry.created_at,
        };
      })
    );

    const { error } = await supabase.from("journal_chunks").insert(rows);
    if (error) throw error;

    console.log(`Embedded ${rows.length} chunks for entry ${entry.id}`);
    return new Response(JSON.stringify({ chunks: rows.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("embed-journal-entry error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
