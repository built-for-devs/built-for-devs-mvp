-- Store Folk CRM person ID on developers for sync-back after enrichment
ALTER TABLE developers ADD COLUMN folk_person_id text;
