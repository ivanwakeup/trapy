/**
 * Re-triggers the embed webhook for journal entries that have no chunks.
 * Updates entries one at a time with a delay to avoid rate-limiting Gemini.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> SUPABASE_USER_ID=<uid> node scripts/reembed-failed.mjs
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
const DELAY_MS = 15000;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !USER_ID) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_USER_ID");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  // Fetch all entry IDs and all chunk entry IDs, diff in JS
  const [{ data: allEntries, error: e1 }, { data: allChunks, error: e2 }] = await Promise.all([
    supabase.from("journal_entries").select("id, created_at").eq("user_id", USER_ID),
    supabase.from("journal_chunks").select("entry_id").eq("user_id", USER_ID),
  ]);

  if (e1) throw e1;
  if (e2) throw e2;

  const embeddedIds = new Set((allChunks ?? []).map((c) => c.entry_id));
  const entries = (allEntries ?? []).filter((e) => !embeddedIds.has(e.id));

  if (entries.length === 0) {
    console.log("No un-embedded entries found — all good.");
    return;
  }

  console.log(`Found ${entries.length} entries without chunks. Re-triggering webhooks...\n`);

  for (let i = 0; i < entries.length; i++) {
    const { id, created_at } = entries[i];
    const remaining = entries.length - i - 1;
    process.stdout.write(`[${i + 1}/${entries.length}] ${created_at.slice(0, 10)} (${id.slice(0, 8)})... `);

    const { error: updateError } = await supabase
      .from("journal_entries")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      console.log(`FAILED — ${updateError.message}`);
    } else {
      console.log(`✓  (${remaining} remaining)`);
    }

    if (i < entries.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log("\nDone. Check embed-journal-entry logs in Supabase for any remaining failures.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
