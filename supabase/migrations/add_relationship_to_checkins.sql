-- Add relationship_id to checkins so each check-in can be associated with a person
ALTER TABLE checkins
  ADD COLUMN IF NOT EXISTS relationship_id uuid REFERENCES relationships(id) ON DELETE SET NULL;
