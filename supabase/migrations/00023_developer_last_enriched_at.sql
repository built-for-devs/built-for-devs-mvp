-- Add last_enriched_at timestamp so admins can sort/filter by enrichment recency
ALTER TABLE developers ADD COLUMN last_enriched_at timestamptz;

CREATE INDEX idx_dev_last_enriched ON developers(last_enriched_at DESC NULLS LAST);
