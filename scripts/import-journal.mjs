/**
 * Bulk-imports a plain-text journal file into Supabase journal_entries.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> SUPABASE_USER_ID=<uid> node scripts/import-journal.mjs [path/to/file.txt]
 *
 * Flags:
 *   --wipe      Delete all existing journal_entries and journal_chunks for this user first
 *   --dry-run   Preview parsed + fixed entries without writing anything
 *
 * After import, run chunk-entries.mjs to process all entries through Claude.
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
const FILE_PATH = process.argv.find((a) => !a.startsWith("--") && a.endsWith(".txt")) ?? `${process.env.HOME}/Downloads/Ivan's Journal.txt`;
const DELAY_MS = 300;
const WIPE = process.argv.includes("--wipe");
const DRY_RUN = process.argv.includes("--dry-run");

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

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parseJournal(text) {
  text = text.replace(/^﻿/, ""); // strip BOM
  const parts = text.split(/^(\d{4}-\d{2}-\d{2})\s*$/m);
  // parts: ['preamble', 'YYYY-MM-DD', 'body', 'YYYY-MM-DD', 'body', ...]
  const entries = [];
  for (let i = 1; i < parts.length; i += 2) {
    const date = parts[i].trim();
    const body = parts[i + 1]?.trim();
    if (date && body) entries.push({ date, body });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Date fixing — journal must be strictly chronological.
// Month and day are assumed correct; only year is adjusted.
// ---------------------------------------------------------------------------

function fixDates(entries) {
  const fixed = [];
  let lastYear = 0;
  let lastDate = null;
  let fixCount = 0;

  for (const entry of entries) {
    const [yearStr, mm, dd] = entry.date.split("-");
    let year = parseInt(yearStr, 10);

    if (year < lastYear) {
      // Year went backwards — advance it until the date is after lastDate
      let candidate = new Date(`${year}-${mm}-${dd}T12:00:00Z`);
      while (candidate <= lastDate) {
        year += 1;
        candidate = new Date(`${year}-${mm}-${dd}T12:00:00Z`);
      }
      fixCount++;
      fixed.push({ ...entry, date: `${year}-${mm}-${dd}`, originalDate: entry.date });
      lastDate = candidate;
      lastYear = year;
    } else {
      // Year is >= lastYear: trust the entry as written
      fixed.push(entry);
      lastYear = year;
      lastDate = new Date(`${entry.date}T12:00:00Z`);
    }
  }

  return { entries: fixed, fixCount };
}

// ---------------------------------------------------------------------------
// Text normalisation — whitespace only, content untouched
// ---------------------------------------------------------------------------

function normalizeBody(text) {
  return text
    .replace(/\r\n/g, "\n")        // CRLF → LF
    .replace(/\r/g, "\n")          // stray CR → LF
    .split("\n")
    .map((line) => line.trimEnd()) // strip trailing spaces per line
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")   // collapse 3+ blank lines to 1 blank line
    .trim();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`\nReading: ${FILE_PATH}`);
  const text = readFileSync(FILE_PATH, "utf-8");
  const raw = parseJournal(text);

  if (raw.length === 0) {
    console.error("No entries found. Check that the file has YYYY-MM-DD date lines.");
    process.exit(1);
  }

  // Fix out-of-order years
  const { entries, fixCount } = fixDates(raw);

  // Normalize body text
  const normalized = entries.map((e) => ({ ...e, body: normalizeBody(e.body) }));

  console.log(`Found ${normalized.length} entries (${normalized[0].date} → ${normalized[normalized.length - 1].date})`);
  if (fixCount > 0) {
    console.log(`Fixed ${fixCount} out-of-order year${fixCount === 1 ? "" : "s"}:`);
    entries
      .filter((e) => e.originalDate)
      .forEach((e) => console.log(`  ${e.originalDate} → ${e.date}`));
  }
  console.log();

  if (DRY_RUN) {
    console.log("DRY RUN — no writes will happen.\n");
    normalized.slice(0, 8).forEach((e) =>
      console.log(`  ${e.date}${e.originalDate ? ` (was ${e.originalDate})` : ""}  ${e.body.slice(0, 72)}…`)
    );
    if (normalized.length > 8) console.log(`  … and ${normalized.length - 8} more`);
    return;
  }

  if (WIPE) {
    process.stdout.write("Wiping existing journal_chunks… ");
    const { error: e1 } = await supabase.from("journal_chunks").delete().eq("user_id", USER_ID);
    if (e1) throw e1;
    console.log("done.");

    process.stdout.write("Wiping existing journal_entries… ");
    const { error: e2 } = await supabase.from("journal_entries").delete().eq("user_id", USER_ID);
    if (e2) throw e2;
    console.log("done.\n");
  }

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < normalized.length; i++) {
    const { date, body, originalDate } = normalized[i];
    const timestamp = new Date(`${date}T12:00:00.000Z`).toISOString();
    const remaining = normalized.length - i - 1;
    const tag = originalDate ? ` [year fixed from ${originalDate}]` : "";

    process.stdout.write(`[${i + 1}/${normalized.length}] ${date}${tag} (${body.length} chars)… `);

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
      console.log(`✓  (${remaining} left)`);
      inserted++;
    }

    if (i < normalized.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone. ${inserted} inserted, ${skipped} failed.`);
  if (fixCount > 0) console.log(`${fixCount} entry date${fixCount === 1 ? "" : "s"} had their year corrected.`);
  console.log("Run chunk-entries.mjs next to process all entries through Claude.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
