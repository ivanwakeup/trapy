/**
 * Bulk-imports a plain-text journal file into Supabase journal_entries.
 * Each INSERT triggers the embed-journal-entry webhook automatically.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> SUPABASE_USER_ID=<uid> node scripts/import-journal.mjs [path/to/file.txt]
 *
 * Get your user ID from: Supabase dashboard → Authentication → Users
 * Get the service role key from: Supabase dashboard → Project Settings → API
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;
const FILE_PATH = process.argv[2] ?? `${process.env.HOME}/Downloads/Ivan's Journal.txt`;
const DELAY_MS = 15000; // 15s between inserts — ~4/min, conservative for Gemini free tier

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !USER_ID) {
  console.error(
    "\nMissing required environment variables.\n" +
    "Run with:\n" +
    "  SUPABASE_SERVICE_ROLE_KEY=<key> SUPABASE_USER_ID=<uid> node scripts/import-journal.mjs\n\n" +
    "  Service role key: Supabase dashboard → Project Settings → API\n" +
    "  User ID:          Supabase dashboard → Authentication → Users\n"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function parseJournal(text) {
  // Strip BOM if present
  text = text.replace(/^﻿/, "");

  // Split on lines that are just a YYYY-MM-DD date
  const parts = text.split(/^(\d{4}-\d{2}-\d{2})\s*$/m);

  // parts: ['preamble', 'YYYY-MM-DD', 'body', 'YYYY-MM-DD', 'body', ...]
  const entries = [];
  for (let i = 1; i < parts.length; i += 2) {
    const date = parts[i].trim();
    const body = parts[i + 1]?.trim();
    if (date && body && body.length > 0) {
      entries.push({ date, body });
    }
  }
  return entries;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatETA(remainingCount, delayMs) {
  const seconds = Math.round((remainingCount * delayMs) / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `~${m}m ${s}s` : `~${s}s`;
}

async function main() {
  console.log(`\nReading: ${FILE_PATH}`);
  const text = readFileSync(FILE_PATH, "utf-8");
  const entries = parseJournal(text);

  if (entries.length === 0) {
    console.error("No entries found. Check that the file has YYYY-MM-DD date lines.");
    process.exit(1);
  }

  console.log(`Found ${entries.length} entries (${entries[0].date} → ${entries[entries.length - 1].date})`);
  console.log(`Estimated time: ${formatETA(entries.length, DELAY_MS)} at ${DELAY_MS / 1000}s between inserts\n`);

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < entries.length; i++) {
    const { date, body } = entries[i];
    const timestamp = new Date(date + "T12:00:00.000Z").toISOString();
    const remaining = entries.length - i - 1;

    process.stdout.write(`[${i + 1}/${entries.length}] ${date} (${body.length} chars)... `);

    const { error } = await supabase.from("journal_entries").insert({
      user_id: USER_ID,
      body,
      created_at: timestamp,
      updated_at: timestamp,
    });

    if (error) {
      console.log(`FAILED — ${error.message}`);
      skipped++;
    } else {
      console.log(`✓  (${remaining} left, ETA ${formatETA(remaining, DELAY_MS)})`);
      inserted++;
    }

    if (i < entries.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nDone. ${inserted} inserted, ${skipped} failed.`);
  console.log("The embed-journal-entry webhook is processing each entry in the background.");
  console.log("Check Supabase → Edge Functions → embed-journal-entry logs to monitor progress.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
