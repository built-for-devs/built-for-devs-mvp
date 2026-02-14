-- Normalize all text[] column values to lowercase for consistent filtering.
-- Enrichment data from Claude comes in mixed case (e.g., "Laravel" vs "laravel").
-- Filter dropdowns and overlaps queries need consistent casing.

-- Helper: lowercases every element in a text array (NULL-safe: returns NULL for NULL input)
CREATE OR REPLACE FUNCTION pg_temp.lower_array(arr text[])
RETURNS text[] AS $$
  SELECT array_agg(lower(elem)) FROM unnest(arr) AS elem;
$$ LANGUAGE sql IMMUTABLE;

UPDATE developers SET
  role_types         = pg_temp.lower_array(role_types),
  languages          = pg_temp.lower_array(languages),
  frameworks         = pg_temp.lower_array(frameworks),
  databases          = pg_temp.lower_array(databases),
  cloud_platforms    = pg_temp.lower_array(cloud_platforms),
  devops_tools       = pg_temp.lower_array(devops_tools),
  cicd_tools         = pg_temp.lower_array(cicd_tools),
  testing_frameworks = pg_temp.lower_array(testing_frameworks),
  industries         = pg_temp.lower_array(industries),
  paid_tools         = pg_temp.lower_array(paid_tools);
