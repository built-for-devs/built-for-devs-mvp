-- Allow admins to create companies and projects
CREATE POLICY "companies_insert_admin" ON companies
  FOR INSERT WITH CHECK (public.user_role() = 'admin');

CREATE POLICY "projects_insert_admin" ON projects
  FOR INSERT WITH CHECK (public.user_role() = 'admin');
