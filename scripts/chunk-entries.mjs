/**
 * Chunks all journal entries using Claude and writes results to journal_chunks,
 * leaving the embedding column null. Run this to populate themes, emotional_tone,
 * arc_position, and people without needing Voyage API credits.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> SUPABASE_USER_ID=<uid> node scripts/chunk-entries.mjs
 *
 * ANTHROPIC_API_KEY is read from .env automatically.
 * Add --force to re-chunk entries that already have chunks.
 * Add --dry-run to preview without writing to the DB.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-haiku-4-5-20251001";
const DELAY_MS = 300;
const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !USER_ID || !ANTHROPIC_API_KEY) {
  console.error("Missing required env vars: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_USER_ID, ANTHROPIC_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function chunkEntry(body, checkin) {
  const checkinBlock = checkin
    ? `Context from their check-in before writing:
- Activation level: ${checkin.activation_level}/10
- Triggers they identified: ${checkin.triggers?.join(", ") || "none"}
- Thoughts running: ${checkin.thoughts?.join(", ") || "none"}
- Urges they felt: ${checkin.urges?.join(", ") || "none"}

`
    : "";

  const prompt = `You are analyzing a personal journal entry written by someone working on anxious attachment patterns.

Segment this entry into emotionally coherent chunks. Each chunk is a distinct beat — a moment where the emotional state, perspective, or self-awareness meaningfully shifts.

${checkinBlock}Journal entry:
${body}

Return a JSON array only. Each element:
{
  "text": "<exact text — do not paraphrase>",
  "emotional_tone": "<single word: e.g. anxious, settled, avoidant, curious, overwhelmed>",
  "themes": ["<1-3 themes: e.g. abandonment fear, waiting, physical sensation, reassurance seeking>"],
  "arc_position": "<onset | escalation | peak | de-escalation | resolution | reflection>",
  "people": ["<name or role of each person mentioned in this chunk: e.g. Mary, mom, my therapist, John — use the exact name/term as written>"]
}

Rules:
- Each chunk: 1-5 sentences
- Start a new chunk when emotional tone or perspective meaningfully shifts
- Preserve exact text — never summarize or rephrase
- If the entry is under 3 sentences, return it as a single chunk
- Return only the JSON array, no other text`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const raw = data.content?.[0]?.text?.trim() ?? "[]";
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error(`Unexpected Claude response: ${raw}`);

  return JSON.parse(match[0]);
}

async function main() {
  if (DRY_RUN) console.log("DRY RUN — no writes will happen\n");

  const { data: entries, error: e1 } = await supabase
    .from("journal_entries")
    .select("id, created_at, body, checkin_id")
    .eq("user_id", USER_ID)
    .not("body", "is", null)
    .order("created_at", { ascending: true });

  if (e1) throw e1;
  if (!entries?.length) { console.log("No entries found."); return; }

  let toProcess = entries.filter((e) => e.body?.trim());

  if (!FORCE) {
    const { data: existingChunks } = await supabase
      .from("journal_chunks")
      .select("entry_id")
      .eq("user_id", USER_ID);

    const chunkedIds = new Set((existingChunks ?? []).map((c) => c.entry_id));
    toProcess = toProcess.filter((e) => !chunkedIds.has(e.id));
  }

  console.log(`${entries.length} total entries, ${toProcess.length} to chunk${FORCE ? " (--force)" : ""}\n`);
  if (!toProcess.length) return;

  // Fetch checkin context for all entries that have one
  const checkinIds = [...new Set(toProcess.map((e) => e.checkin_id).filter(Boolean))];
  const checkinById = {};
  if (checkinIds.length > 0) {
    const { data: checkins } = await supabase
      .from("checkins")
      .select("id, activation_level, triggers, thoughts, urges")
      .in("id", checkinIds);
    for (const c of checkins ?? []) checkinById[c.id] = c;
  }

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const entry = toProcess[i];
    const date = entry.created_at?.slice(0, 10) ?? "unknown";
    const checkin = entry.checkin_id ? checkinById[entry.checkin_id] : undefined;

    process.stdout.write(`[${i + 1}/${toProcess.length}] ${date}... `);

    try {
      const chunks = await chunkEntry(entry.body, checkin);
      const allPeople = [...new Set(chunks.flatMap((c) => c.people ?? []))];

      if (DRY_RUN) {
        const themes = [...new Set(chunks.flatMap((c) => c.themes ?? []))];
        console.log(`${chunks.length} chunks | themes: ${themes.join(", ")} | people: ${allPeople.join(", ") || "none"}`);
      } else {
        // Delete any existing chunks first (handles --force re-runs)
        await supabase.from("journal_chunks").delete().eq("entry_id", entry.id);

        const rows = chunks.map((chunk, index) => ({
          entry_id: entry.id,
          user_id: USER_ID,
          chunk_index: index,
          text: chunk.text,
          emotional_tone: chunk.emotional_tone,
          themes: chunk.themes,
          arc_position: chunk.arc_position,
          people: chunk.people ?? [],
          embedding: null,
          embedding_model: null,
          entry_date: entry.created_at,
        }));

        const { error: insertError } = await supabase.from("journal_chunks").insert(rows);
        if (insertError) throw insertError;

        console.log(`${chunks.length} chunks | people: ${allPeople.join(", ") || "none"}`);
      }

      processed++;
    } catch (err) {
      console.log(`FAILED — ${err.message}`);
      failed++;
    }

    if (i < toProcess.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone. ${processed} chunked, ${failed} failed.`);
  if (DRY_RUN) console.log("(dry run — nothing was written)");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
