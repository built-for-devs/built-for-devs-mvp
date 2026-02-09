-- ==========================================================================
-- BUILT FOR DEVS — FULL DATABASE MIGRATION
-- Run this in the Supabase Dashboard SQL Editor (https://supabase.com/dashboard)
-- ==========================================================================

-- ==========================================================================
-- PART 1: ENUMS
-- ==========================================================================

CREATE TYPE user_role AS ENUM ('developer', 'company', 'admin');

CREATE TYPE seniority_level AS ENUM (
  'junior', 'mid', 'senior', 'staff', 'principal',
  'lead', 'manager', 'director', 'vp_plus'
);

CREATE TYPE company_size AS ENUM (
  '1-10', '11-50', '51-200', '201-1000', '1001-5000', '5000+'
);

CREATE TYPE buying_influence_level AS ENUM (
  'individual_contributor', 'team_influencer',
  'decision_maker', 'budget_holder'
);

CREATE TYPE oss_activity AS ENUM (
  'none', 'occasional', 'regular', 'maintainer'
);

CREATE TYPE project_status AS ENUM (
  'draft', 'pending_payment', 'paid', 'matching',
  'in_progress', 'evaluations_complete',
  'report_drafting', 'delivered', 'closed'
);

CREATE TYPE evaluation_status AS ENUM (
  'invited', 'accepted', 'declined', 'expired',
  'recording', 'submitted', 'in_review',
  'approved', 'rejected', 'paid'
);

-- ==========================================================================
-- PART 2: TABLES
-- ==========================================================================

-- 1. profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. developers
CREATE TABLE developers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Professional Identity
  job_title text,
  role_types text[] DEFAULT '{}',
  years_experience integer,
  seniority seniority_level,
  current_company text,
  company_size company_size,
  industries text[] DEFAULT '{}',

  -- Technical Profile
  languages text[] DEFAULT '{}',
  frameworks text[] DEFAULT '{}',
  databases text[] DEFAULT '{}',
  cloud_platforms text[] DEFAULT '{}',
  devops_tools text[] DEFAULT '{}',
  cicd_tools text[] DEFAULT '{}',
  testing_frameworks text[] DEFAULT '{}',
  api_experience text[] DEFAULT '{}',
  operating_systems text[] DEFAULT '{}',

  -- Development Context
  team_size integer,
  buying_influence buying_influence_level,
  paid_tools text[] DEFAULT '{}',
  open_source_activity oss_activity,

  -- Online Profiles
  linkedin_url text,
  github_url text,
  twitter_url text,
  website_url text,
  other_links text[] DEFAULT '{}',

  -- Demographics & Logistics
  country text,
  state_region text,
  timezone text,
  preferred_eval_times text[] DEFAULT '{}',
  paypal_email text,

  -- Platform Meta
  is_available boolean NOT NULL DEFAULT true,
  profile_complete boolean NOT NULL DEFAULT false,
  quality_rating decimal(3,2),
  total_evaluations integer NOT NULL DEFAULT 0,
  response_rate decimal(3,2),
  imported boolean NOT NULL DEFAULT false,
  import_source text,
  admin_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. companies
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website text,
  industry text,
  size text,
  stripe_customer_id text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. company_contacts
CREATE TABLE company_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_at_company text,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. projects
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES company_contacts(id),
  status project_status NOT NULL DEFAULT 'draft',

  -- Product Info
  product_name text NOT NULL,
  product_url text,
  product_category text,
  product_description text,
  evaluation_scope text,
  setup_instructions text,
  time_to_value_milestone text,

  -- Evaluation Goals
  goals text[] DEFAULT '{}',

  -- ICP Criteria
  icp_role_types text[] DEFAULT '{}',
  icp_min_experience integer,
  icp_seniority_levels text[] DEFAULT '{}',
  icp_languages text[] DEFAULT '{}',
  icp_frameworks text[] DEFAULT '{}',
  icp_company_size_range text[] DEFAULT '{}',
  icp_industries text[] DEFAULT '{}',
  icp_databases text[] DEFAULT '{}',
  icp_cloud_platforms text[] DEFAULT '{}',
  icp_devops_tools text[] DEFAULT '{}',
  icp_cicd_tools text[] DEFAULT '{}',
  icp_testing_frameworks text[] DEFAULT '{}',
  icp_api_experience text[] DEFAULT '{}',
  icp_operating_systems text[] DEFAULT '{}',
  icp_team_size_range text[] DEFAULT '{}',
  icp_buying_influence text[] DEFAULT '{}',
  icp_paid_tools text[] DEFAULT '{}',
  icp_open_source_activity text[] DEFAULT '{}',

  -- Project Parameters
  num_evaluations integer NOT NULL,
  price_per_evaluation integer NOT NULL DEFAULT 399,
  total_price integer,
  preferred_timeline text,

  -- Payment
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,

  -- Findings Report
  findings_report text,
  report_published boolean NOT NULL DEFAULT false,
  report_published_at timestamptz,

  -- Meta
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. evaluations
CREATE TABLE evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  developer_id uuid NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  status evaluation_status NOT NULL DEFAULT 'invited',

  -- Invitation
  invited_at timestamptz NOT NULL DEFAULT now(),
  invitation_expires_at timestamptz,
  responded_at timestamptz,

  -- Recording
  recording_deadline timestamptz,
  clarityflow_conversation_id text,
  recording_embed_url text,
  recording_completed_at timestamptz,
  transcript text,

  -- Review
  admin_quality_score decimal(3,2),
  admin_review_notes text,
  reviewed_at timestamptz,

  -- Payment
  payout_amount integer,
  payout_method text,
  paid_at timestamptz,
  payout_reference text,

  -- Anonymized Display
  anonymous_descriptor text,

  -- Meta
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (project_id, developer_id)
);

-- ==========================================================================
-- PART 3: INDEXES
-- ==========================================================================

-- GIN indexes on developers text[] columns
CREATE INDEX idx_developers_role_types ON developers USING GIN (role_types);
CREATE INDEX idx_developers_languages ON developers USING GIN (languages);
CREATE INDEX idx_developers_frameworks ON developers USING GIN (frameworks);
CREATE INDEX idx_developers_databases ON developers USING GIN (databases);
CREATE INDEX idx_developers_cloud_platforms ON developers USING GIN (cloud_platforms);
CREATE INDEX idx_developers_devops_tools ON developers USING GIN (devops_tools);
CREATE INDEX idx_developers_cicd_tools ON developers USING GIN (cicd_tools);
CREATE INDEX idx_developers_testing_frameworks ON developers USING GIN (testing_frameworks);
CREATE INDEX idx_developers_api_experience ON developers USING GIN (api_experience);
CREATE INDEX idx_developers_operating_systems ON developers USING GIN (operating_systems);
CREATE INDEX idx_developers_industries ON developers USING GIN (industries);
CREATE INDEX idx_developers_paid_tools ON developers USING GIN (paid_tools);

-- Standard indexes on developers
CREATE INDEX idx_developers_seniority ON developers (seniority);
CREATE INDEX idx_developers_years_experience ON developers (years_experience);
CREATE INDEX idx_developers_company_size ON developers (company_size);
CREATE INDEX idx_developers_is_available ON developers (is_available);
CREATE INDEX idx_developers_buying_influence ON developers (buying_influence);

-- Standard indexes on projects
CREATE INDEX idx_projects_company_id ON projects (company_id);
CREATE INDEX idx_projects_status ON projects (status);
CREATE INDEX idx_projects_created_at ON projects (created_at);

-- Standard indexes on evaluations
CREATE INDEX idx_evaluations_project_id ON evaluations (project_id);
CREATE INDEX idx_evaluations_developer_id ON evaluations (developer_id);
CREATE INDEX idx_evaluations_status ON evaluations (status);
CREATE INDEX idx_evaluations_invited_at ON evaluations (invited_at);

-- ==========================================================================
-- PART 4: RLS POLICIES
-- ==========================================================================

-- Helper function to check current user's role
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (public.user_role() = 'admin');

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (public.user_role() = 'admin');

CREATE POLICY "profiles_insert_service" ON profiles
  FOR INSERT WITH CHECK (true);

-- DEVELOPERS
ALTER TABLE developers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "developers_select_own" ON developers
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "developers_select_admin" ON developers
  FOR SELECT USING (public.user_role() = 'admin');

CREATE POLICY "developers_update_own" ON developers
  FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "developers_update_admin" ON developers
  FOR UPDATE USING (public.user_role() = 'admin');

CREATE POLICY "developers_insert_service" ON developers
  FOR INSERT WITH CHECK (true);

-- COMPANIES
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select_own" ON companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM company_contacts WHERE profile_id = auth.uid())
  );

CREATE POLICY "companies_select_admin" ON companies
  FOR SELECT USING (public.user_role() = 'admin');

CREATE POLICY "companies_update_admin" ON companies
  FOR UPDATE USING (public.user_role() = 'admin');

CREATE POLICY "companies_insert_company" ON companies
  FOR INSERT WITH CHECK (public.user_role() = 'company');

-- COMPANY_CONTACTS
ALTER TABLE company_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_contacts_select_own" ON company_contacts
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "company_contacts_select_admin" ON company_contacts
  FOR SELECT USING (public.user_role() = 'admin');

CREATE POLICY "company_contacts_insert_own" ON company_contacts
  FOR INSERT WITH CHECK (profile_id = auth.uid());

-- PROJECTS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_own_company" ON projects
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM company_contacts WHERE profile_id = auth.uid())
  );

CREATE POLICY "projects_select_admin" ON projects
  FOR SELECT USING (public.user_role() = 'admin');

CREATE POLICY "projects_insert_own_company" ON projects
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM company_contacts WHERE profile_id = auth.uid())
  );

CREATE POLICY "projects_update_admin" ON projects
  FOR UPDATE USING (public.user_role() = 'admin');

-- EVALUATIONS
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evaluations_select_admin" ON evaluations
  FOR SELECT USING (public.user_role() = 'admin');

CREATE POLICY "evaluations_insert_admin" ON evaluations
  FOR INSERT WITH CHECK (public.user_role() = 'admin');

CREATE POLICY "evaluations_update_admin" ON evaluations
  FOR UPDATE USING (public.user_role() = 'admin');

CREATE POLICY "evaluations_select_developer" ON evaluations
  FOR SELECT USING (
    developer_id IN (SELECT id FROM developers WHERE profile_id = auth.uid())
  );

CREATE POLICY "evaluations_update_developer" ON evaluations
  FOR UPDATE USING (
    developer_id IN (SELECT id FROM developers WHERE profile_id = auth.uid())
  );

CREATE POLICY "evaluations_select_company" ON evaluations
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN company_contacts cc ON cc.company_id = p.company_id
      WHERE cc.profile_id = auth.uid()
    )
  );

-- VIEWS for column-restricted access
CREATE VIEW company_evaluations_view AS
SELECT
  id, project_id, status, anonymous_descriptor,
  recording_embed_url, transcript, recording_completed_at
FROM evaluations;

CREATE VIEW developer_evaluations_view AS
SELECT
  e.id, e.project_id, e.status, e.recording_deadline,
  e.clarityflow_conversation_id, e.payout_amount, e.paid_at,
  e.invited_at, e.invitation_expires_at,
  p.product_name, p.product_description, p.evaluation_scope,
  p.setup_instructions, p.time_to_value_milestone, p.goals
FROM evaluations e
JOIN projects p ON p.id = e.project_id;

-- ==========================================================================
-- PART 5: UPDATED_AT TRIGGERS
-- ==========================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_developers
  BEFORE UPDATE ON developers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_companies
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_projects
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_evaluations
  BEFORE UPDATE ON evaluations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================================================
-- PART 6: AUTH TRIGGER (auto-create profile on signup)
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _role user_role;
  _full_name text;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  _role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'developer')::user_role;

  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, _full_name, _role);

  -- If developer, also create developer record
  IF _role = 'developer' THEN
    INSERT INTO public.developers (profile_id)
    VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
