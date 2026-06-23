-- ============================================================
-- 1. Relationships table
--    Stores the user's named relationships (partner, therapist, etc.)
-- ============================================================

CREATE TABLE relationships (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text        NOT NULL,              -- "Mary", "mom", "John"
  relationship_type text,                             -- "therapist", "partner", "friend", "family", "coworker"
  notes            text,                              -- free-text context about this person
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own relationships"
  ON relationships FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX relationships_user_id_idx ON relationships (user_id);

-- ============================================================
-- 2. Add people[] to journal_chunks
--    Populated by the embed-journal-entry function (Gemini extraction)
-- ============================================================

ALTER TABLE journal_chunks
  ADD COLUMN IF NOT EXISTS people text[] NOT NULL DEFAULT '{}';

-- ============================================================
-- 3. Add people[] to journal_entries
--    Populated as the union of people across all chunks for that entry
-- ============================================================

ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS people text[] NOT NULL DEFAULT '{}';
