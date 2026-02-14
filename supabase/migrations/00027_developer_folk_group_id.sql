-- Store Folk CRM group ID so we can sync custom fields back to the right group
ALTER TABLE developers ADD COLUMN folk_group_id text;
