-- Replace directory_products view to include previous score for delta display
DROP VIEW IF EXISTS directory_products;

CREATE VIEW directory_products AS
SELECT
  latest.id,
  latest.slug,
  latest.target_url,
  latest.target_domain,
  latest.final_score,
  latest.classification,
  latest.full_evaluation,
  latest.company_name,
  latest.directory_hidden,
  latest.completed_at,
  latest.created_at,
  prev.final_score AS previous_score
FROM (
  SELECT DISTINCT ON (target_domain) *
  FROM scores
  WHERE status = 'complete'
    AND directory_hidden = false
  ORDER BY target_domain, completed_at DESC
) latest
LEFT JOIN LATERAL (
  SELECT final_score
  FROM scores s2
  WHERE s2.target_domain = latest.target_domain
    AND s2.status = 'complete'
    AND s2.id != latest.id
  ORDER BY s2.completed_at DESC
  LIMIT 1
) prev ON true;

-- Allow public read access on the view
GRANT SELECT ON directory_products TO anon, authenticated;
