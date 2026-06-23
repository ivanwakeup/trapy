-- ============================================================
-- Switch from gemini-embedding-001 (768-dim) to voyage-3 (1024-dim).
-- Wipes all existing chunks — re-run reembed-failed.mjs after deploying.
-- ============================================================

-- 1. Clear all existing Gemini embeddings
DELETE FROM journal_chunks;

-- 2. Swap the embedding column to 1024 dims
ALTER TABLE journal_chunks DROP COLUMN embedding;
ALTER TABLE journal_chunks ADD COLUMN embedding vector(1024);

-- 3. Drop old 768-dim match function and recreate for 1024
DROP FUNCTION IF EXISTS match_journal_chunks(vector, uuid, int);

CREATE OR REPLACE FUNCTION match_journal_chunks(
  query_embedding vector(1024),
  user_id_filter  uuid,
  match_count     int DEFAULT 5
)
RETURNS TABLE (
  id             uuid,
  text           text,
  emotional_tone text,
  arc_position   text,
  entry_date     timestamptz,
  similarity     float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jc.id,
    jc.text,
    jc.emotional_tone,
    jc.arc_position,
    jc.entry_date,
    1 - (jc.embedding <=> query_embedding) AS similarity
  FROM journal_chunks jc
  WHERE jc.user_id = user_id_filter
    AND jc.embedding IS NOT NULL
  ORDER BY jc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
