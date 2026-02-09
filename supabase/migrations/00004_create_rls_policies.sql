-- Migration: Row-Level Security policies
-- Helper: checks if the current user has a specific role in the profiles table.

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admins can read all profiles
CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (public.user_role() = 'admin');

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Admins can update any profile
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (public.user_role() = 'admin');

-- Allow insert from auth trigger (service role bypasses RLS, but be explicit)
CREATE POLICY "profiles_insert_service" ON profiles
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- DEVELOPERS
-- ============================================================
ALTER TABLE developers ENABLE ROW LEVEL SECURITY;

-- Developer can read their own record
CREATE POLICY "developers_select_own" ON developers
  FOR SELECT USING (profile_id = auth.uid());

-- Admins can read all developers
CREATE POLICY "developers_select_admin" ON developers
  FOR SELECT USING (public.user_role() = 'admin');

-- Developer can update their own record
CREATE POLICY "developers_update_own" ON developers
  FOR UPDATE USING (profile_id = auth.uid());

-- Admins can update any developer
CREATE POLICY "developers_update_admin" ON developers
  FOR UPDATE USING (public.user_role() = 'admin');

-- Allow insert from auth trigger
CREATE POLICY "developers_insert_service" ON developers
  FOR INSERT WITH CHECK (true);

-- NOTE: Companies have NO access to this table whatsoever.

-- ============================================================
-- COMPANIES
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Company contacts can read their own company
CREATE POLICY "companies_select_own" ON companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM company_contacts WHERE profile_id = auth.uid()
    )
  );

-- Admins can read all companies
CREATE POLICY "companies_select_admin" ON companies
  FOR SELECT USING (public.user_role() = 'admin');

-- Admins can update any company
CREATE POLICY "companies_update_admin" ON companies
  FOR UPDATE USING (public.user_role() = 'admin');

-- Company contacts can insert (during onboarding)
CREATE POLICY "companies_insert_company" ON companies
  FOR INSERT WITH CHECK (public.user_role() = 'company');

-- ============================================================
-- COMPANY_CONTACTS
-- ============================================================
ALTER TABLE company_contacts ENABLE ROW LEVEL SECURITY;

-- User can read their own record
CREATE POLICY "company_contacts_select_own" ON company_contacts
  FOR SELECT USING (profile_id = auth.uid());

-- Admins can read all
CREATE POLICY "company_contacts_select_admin" ON company_contacts
  FOR SELECT USING (public.user_role() = 'admin');

-- Company users can insert their own contact record (during onboarding)
CREATE POLICY "company_contacts_insert_own" ON company_contacts
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- ============================================================
-- PROJECTS
-- ============================================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Company contacts can read their own company's projects
CREATE POLICY "projects_select_own_company" ON projects
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM company_contacts WHERE profile_id = auth.uid()
    )
  );

-- Admins can read all projects
CREATE POLICY "projects_select_admin" ON projects
  FOR SELECT USING (public.user_role() = 'admin');

-- Company contacts can create projects for their company
CREATE POLICY "projects_insert_own_company" ON projects
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_contacts WHERE profile_id = auth.uid()
    )
  );

-- Admins can update any project
CREATE POLICY "projects_update_admin" ON projects
  FOR UPDATE USING (public.user_role() = 'admin');

-- NOTE: Developers have NO access to this table.

-- ============================================================
-- EVALUATIONS
-- ============================================================
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "evaluations_select_admin" ON evaluations
  FOR SELECT USING (public.user_role() = 'admin');

CREATE POLICY "evaluations_insert_admin" ON evaluations
  FOR INSERT WITH CHECK (public.user_role() = 'admin');

CREATE POLICY "evaluations_update_admin" ON evaluations
  FOR UPDATE USING (public.user_role() = 'admin');

-- Developers can read their own evaluations
-- (column restriction handled at application/view layer)
CREATE POLICY "evaluations_select_developer" ON evaluations
  FOR SELECT USING (
    developer_id IN (
      SELECT id FROM developers WHERE profile_id = auth.uid()
    )
  );

-- Developers can update their own evaluations (accept/decline only — enforced at app layer)
CREATE POLICY "evaluations_update_developer" ON evaluations
  FOR UPDATE USING (
    developer_id IN (
      SELECT id FROM developers WHERE profile_id = auth.uid()
    )
  );

-- Company contacts can read evaluations for their projects
-- (column restriction handled at application/view layer)
CREATE POLICY "evaluations_select_company" ON evaluations
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN company_contacts cc ON cc.company_id = p.company_id
      WHERE cc.profile_id = auth.uid()
    )
  );

-- ============================================================
-- VIEWS for column-restricted access
-- ============================================================

-- View for company contacts: evaluations without developer identity
CREATE VIEW company_evaluations_view AS
SELECT
  id,
  project_id,
  status,
  anonymous_descriptor,
  recording_embed_url,
  transcript,
  recording_completed_at
FROM evaluations;

-- View for developers: their evaluation details (limited columns)
CREATE VIEW developer_evaluations_view AS
SELECT
  e.id,
  e.project_id,
  e.status,
  e.recording_deadline,
  e.clarityflow_conversation_id,
  e.payout_amount,
  e.paid_at,
  e.invited_at,
  e.invitation_expires_at,
  -- Include project info the developer needs
  p.product_name,
  p.product_description,
  p.evaluation_scope,
  p.setup_instructions,
  p.time_to_value_milestone,
  p.goals
FROM evaluations e
JOIN projects p ON p.id = e.project_id;
