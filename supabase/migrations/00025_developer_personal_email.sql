-- Add personal_email column to developers for durable contact info
-- (work emails bounce when people change jobs)
ALTER TABLE developers ADD COLUMN personal_email text;
