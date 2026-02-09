-- Migration: Create all tables in FK-dependency order

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

  -- ICP Criteria (every developer attribute gets a corresponding ICP field)
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

  -- A developer can only be assigned once per project
  UNIQUE (project_id, developer_id)
);
