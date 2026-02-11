-- Simplify seniority_level enum from 9 values to 3:
-- early_career (was: junior, mid)
-- senior (was: senior, staff, principal)
-- leadership (was: lead, manager, director, vp_plus)

-- Map existing data to new values
UPDATE developers SET seniority = 'senior'
  WHERE seniority IN ('staff', 'principal');

UPDATE developers SET seniority = 'junior'
  WHERE seniority = 'mid';

-- 'junior' will become 'early_career', 'lead' will become 'leadership'
-- but we need to handle the column type change first

-- Convert column to text temporarily
ALTER TABLE developers ALTER COLUMN seniority TYPE text;

-- Map remaining old values to new values
UPDATE developers SET seniority = 'early_career' WHERE seniority = 'junior';
UPDATE developers SET seniority = 'leadership' WHERE seniority IN ('lead', 'manager', 'director', 'vp_plus');

-- Drop the old enum type
DROP TYPE seniority_level;

-- Create the new simplified enum
CREATE TYPE seniority_level AS ENUM ('early_career', 'senior', 'leadership');

-- Convert column back to enum
ALTER TABLE developers ALTER COLUMN seniority TYPE seniority_level USING seniority::seniority_level;
