ALTER TABLE journal_chunks
  ADD COLUMN IF NOT EXISTS cognitive_distortions text[] NOT NULL DEFAULT '{}';
