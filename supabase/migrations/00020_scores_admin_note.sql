-- Add admin_note column for personalized messages in score emails
ALTER TABLE scores ADD COLUMN admin_note text;
