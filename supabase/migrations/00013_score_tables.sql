-- ============================================================
-- SCORE TABLES — Developer Adoption Score tool
-- ============================================================

-- Main scores table
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,

  -- Lead info
  email TEXT NOT NULL,
  name TEXT,
  company_name TEXT,

  -- Target product
  target_url TEXT NOT NULL,
  target_domain TEXT NOT NULL,

  -- Crawl data
  crawl_data JSONB NOT NULL DEFAULT '{}',

  -- Evaluation results (extracted for query convenience)
  scores JSONB NOT NULL DEFAULT '{}',
  red_flag_deductions JSONB DEFAULT '[]',
  base_score INTEGER,
  total_deductions INTEGER DEFAULT 0,
  final_score INTEGER,
  classification TEXT,

  -- Full structured evaluation from Claude
  full_evaluation JSONB NOT NULL DEFAULT '{}',

  -- Metadata
  ip_address INET,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'crawling', 'evaluating', 'complete', 'failed')),
  error_message TEXT,
  processing_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Future link to company account
  company_id UUID REFERENCES companies(id)
);

CREATE INDEX idx_scores_email ON scores(email);
CREATE INDEX idx_scores_slug ON scores(slug);
CREATE INDEX idx_scores_domain ON scores(target_domain);
CREATE INDEX idx_scores_status ON scores(status);
CREATE INDEX idx_scores_created ON scores(created_at DESC);

-- Rate limiting table
CREATE TABLE score_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  score_id UUID REFERENCES scores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_score_rate_limits_ip_date
  ON score_rate_limits(ip_address, created_at DESC);

-- Lead tracking table
CREATE TABLE score_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  company_name TEXT,
  score_count INTEGER DEFAULT 1,
  domains_scored TEXT[] DEFAULT '{}',
  first_score_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latest_score_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  follow_up_status TEXT DEFAULT 'new'
    CHECK (follow_up_status IN ('new', 'contacted', 'responded', 'converted', 'declined')),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_score_leads_email ON score_leads(email);
CREATE INDEX idx_score_leads_status ON score_leads(follow_up_status);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_leads ENABLE ROW LEVEL SECURITY;

-- Anyone can read scores (reports are public/shareable)
CREATE POLICY "scores_select_public" ON scores
  FOR SELECT USING (true);

-- Admin full access
CREATE POLICY "scores_all_admin" ON scores
  FOR ALL USING (public.user_role() = 'admin');

CREATE POLICY "score_leads_all_admin" ON score_leads
  FOR ALL USING (public.user_role() = 'admin');

CREATE POLICY "score_rate_limits_all_admin" ON score_rate_limits
  FOR ALL USING (public.user_role() = 'admin');
