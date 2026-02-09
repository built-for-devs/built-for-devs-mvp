-- Helper function to get project IDs for the current developer
-- Uses SECURITY DEFINER to bypass RLS on evaluations (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.developer_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.project_id FROM evaluations e
  INNER JOIN developers d ON d.id = e.developer_id
  WHERE d.profile_id = auth.uid();
$$;

-- Allow developers to read projects they have evaluations for
CREATE POLICY "projects_select_developer" ON projects
  FOR SELECT USING (
    id IN (SELECT public.developer_project_ids())
  );
