/**
 * Backfills the `people` field on existing journal_chunks and journal_entries.
 * For each entry, sends all its chunk texts to Claude in one call and asks it
 * to identify the people mentioned in each chunk.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> SUPABASE_USER_ID=<uid> node scripts/backfill-people.mjs
 *
 * ANTHROPIC_API_KEY is read from .env automatically.
 *
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
const DELAY_MS = 500;
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !USER_ID || !ANTHROPIC_API_KEY) {
  console.error("Missing required env vars: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_USER_ID, ANTHROPIC_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function extractPeopleForEntry(chunks) {
  const chunkList = chunks
    .map((c, i) => `Chunk ${i + 1}:\n"${c.text}"`)
    .join("\n\n");

  const prompt = `You are analyzing journal chunks written by someone working on anxious attachment patterns.

For each chunk below, identify the names or roles of people mentioned (e.g. "Mary", "my therapist", "mom", "John", "my partner"). Use the exact name or term as written. Return an empty array if no people are mentioned.

${chunkList}

Return a JSON array with one element per chunk, in the same order. Each element is an array of strings:
[
  ["<person mentioned in chunk 1>", ...],
  ["<person mentioned in chunk 2>", ...],
  ...
]

Return only the JSON array, no other text.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const raw = data.content?.[0]?.text?.trim() ?? "[]";
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error(`Unexpected Claude response: ${raw}`);

  const result = JSON.parse(match[0]);
  if (!Array.isArray(result) || result.length !== chunks.length) {
    throw new Error(`Expected ${chunks.length} arrays, got ${result.length}`);
  }
  return result; // string[][]
}

async function main() {
  if (DRY_RUN) console.log("DRY RUN — no writes will happen\n");

  // Fetch all entries for this user
  const { data: entries, error: e1 } = await supabase
    .from("journal_entries")
    .select("id, created_at, body")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: true });

  if (e1) throw e1;
  if (!entries?.length) { console.log("No entries found."); return; }

  // Fetch all chunks for this user
  const { data: allChunks, error: e2 } = await supabase
    .from("journal_chunks")
    .select("id, entry_id, chunk_index, text, people")
    .eq("user_id", USER_ID)
    .order("chunk_index", { ascending: true });

  if (e2) throw e2;

  const chunksByEntry = {};
  for (const chunk of allChunks ?? []) {
    (chunksByEntry[chunk.entry_id] ??= []).push(chunk);
  }

  // Only process entries that have chunks and don't already have people data
  const toProcess = entries.filter((e) => {
    const chunks = chunksByEntry[e.id];
    if (!chunks?.length) return false;
    // Skip if all chunks already have people populated
    const alreadyDone = chunks.every((c) => Array.isArray(c.people) && c.people.length > 0);
    return !alreadyDone;
  });

  console.log(`${entries.length} total entries, ${toProcess.length} need people backfill\n`);

  let processed = 0;
  let skipped = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const entry = toProcess[i];
    const chunks = chunksByEntry[entry.id] ?? [];
    const date = entry.created_at?.slice(0, 10) ?? "unknown";

    process.stdout.write(`[${i + 1}/${toProcess.length}] ${date} (${chunks.length} chunks)... `);

    try {
      const peopleArrays = await extractPeopleForEntry(chunks);
      const allPeople = [...new Set(peopleArrays.flat().filter(Boolean))];

      if (DRY_RUN) {
        console.log(`would write: ${allPeople.join(", ") || "(none)"}`);
      } else {
        // Update each chunk
        for (let j = 0; j < chunks.length; j++) {
          const chunkPeople = (peopleArrays[j] ?? []).filter(Boolean);
          await supabase
            .from("journal_chunks")
            .update({ people: chunkPeople })
            .eq("id", chunks[j].id);
        }

        // Update the entry with the union of all people
        await supabase
          .from("journal_entries")
          .update({ people: allPeople })
          .eq("id", entry.id);

        console.log(`✓  ${allPeople.join(", ") || "(none)"}`);
      }

      processed++;
    } catch (err) {
      console.log(`FAILED — ${err.message}`);
      skipped++;
    }

    if (i < toProcess.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nDone. ${processed} processed, ${skipped} failed.`);
  if (DRY_RUN) console.log("(dry run — nothing was written)");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
