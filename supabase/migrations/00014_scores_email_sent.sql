-- Add email_sent flag to scores table for reliable email delivery
ALTER TABLE scores ADD COLUMN email_sent BOOLEAN NOT NULL DEFAULT false;
