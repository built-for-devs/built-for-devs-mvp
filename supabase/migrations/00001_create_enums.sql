-- Migration: Create all enums
-- These must be created before tables that reference them.

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
