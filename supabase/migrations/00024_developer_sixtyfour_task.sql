-- Track pending SixtyFour async tasks per developer
-- so we can collect results later without blocking imports
ALTER TABLE developers ADD COLUMN sixtyfour_task_id text;

-- Index for quickly finding developers with pending tasks
CREATE INDEX idx_dev_sixtyfour_pending ON developers(sixtyfour_task_id) WHERE sixtyfour_task_id IS NOT NULL;
