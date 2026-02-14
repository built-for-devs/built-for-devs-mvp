-- Add alternative_emails array to developers for storing extra emails
-- found during enrichment (website crawls, GitHub profiles, SixtyFour, etc.)
ALTER TABLE developers
  ADD COLUMN IF NOT EXISTS alternative_emails text[] DEFAULT '{}';
