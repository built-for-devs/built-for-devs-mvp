-- Add opt-out flag for product directory
ALTER TABLE scores
  ADD COLUMN directory_hidden BOOLEAN NOT NULL DEFAULT false;

-- View: one row per domain, latest completed non-hidden score
CREATE VIEW directory_products AS
SELECT DISTINCT ON (target_domain)
  id,
  slug,
  target_url,
  target_domain,
  final_score,
  classification,
  full_evaluation,
  company_name,
  directory_hidden,
  completed_at,
  created_at
FROM scores
WHERE status = 'complete'
  AND directory_hidden = false
ORDER BY target_domain, completed_at DESC;

-- Allow public read access on the view
GRANT SELECT ON directory_products TO anon, authenticated;
