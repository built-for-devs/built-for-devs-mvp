-- Ensure company users can INSERT into companies table during onboarding
-- (re-creates if missing; DROP IF EXISTS prevents errors if already present)

DROP POLICY IF EXISTS "companies_insert_company" ON companies;
CREATE POLICY "companies_insert_company" ON companies
  FOR INSERT WITH CHECK (public.user_role() = 'company');

-- Ensure company users can INSERT into company_contacts for their own record
DROP POLICY IF EXISTS "company_contacts_insert_company" ON company_contacts;
CREATE POLICY "company_contacts_insert_company" ON company_contacts
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- Ensure company users can INSERT projects for their own company
DROP POLICY IF EXISTS "projects_insert_company" ON projects;
CREATE POLICY "projects_insert_company" ON projects
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT cc.company_id FROM company_contacts cc WHERE cc.profile_id = auth.uid()
    )
  );
