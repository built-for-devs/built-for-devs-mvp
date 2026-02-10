# Developer Adoption Score — Build Plan

## What This Is

A self-serve Developer Adoption Score tool hosted at `builtfor.dev/score` that lets companies enter their product URL and receive an AI-generated Developer Adoption Score based on the Built for Devs evaluation framework. This is a top-of-funnel lead generation tool. Every score requires an email to view the full report, and every report bridges to paid evaluations.

### Why This Exists

- Generates qualified leads (companies already thinking about developer experience)
- Demonstrates Built for Devs' expertise before they ever talk to sales
- Creates shareable content that drives organic traffic
- Feeds anonymized data into the Developer Trends product over time
- Positions Built for Devs as the authority on developer adoption readiness

### How It Connects to the Core Platform

The score tool is a standalone feature within the existing Next.js app. It shares the Supabase database but uses its own tables. It does NOT require the company signup/project creation flow. A company can run a score without having a Built for Devs account. If they later sign up for a paid evaluation, their score history can be linked by email.

---

## User Flow

```
1. User lands on builtfor.dev/score
2. User enters a URL (homepage of a developer-facing product)
3. User enters their email address (required)
4. User enters their name (optional) and company name (optional)
5. System checks rate limit: 3 scores per IP per day
6. If rate-limited → show message: "You've hit the daily limit. Come back tomorrow or talk to us about a full evaluation."
7. Loading state while crawl + evaluation runs (30-60 seconds estimated)
8. Redirect to report page: builtfor.dev/score/[slug]
9. Full report displayed with scores, evidence, recommendations
10. CTA sections throughout: "See what real developers think → Book an evaluation"
11. PDF download available
12. Report is permanently accessible at its URL (shareable)
```

---

## Cost Model

Understanding per-score cost is critical for rate limiting and future pricing decisions.

### Estimated Cost Per Score

| Component | Estimated Cost | Notes |
|-----------|---------------|-------|
| Web crawling (Firecrawl or Jina Reader) | $0.01–$0.05 | Depending on pages crawled (3-5 pages per score) |
| Screenshot capture (ScreenshotOne) | $0.01–$0.02 | 1-3 screenshots per score |
| Claude API — Sonnet (input + output tokens) | $0.03–$0.10 | ~4K input tokens crawled content + prompt, ~2K output tokens structured response |
| Supabase storage/queries | Negligible | Within free/Pro tier |
| Vercel serverless execution | Negligible | Within hobby/Pro tier |
| **Total per score** | **~$0.05–$0.17** | Conservative estimate |

### Rate Limiting Decision

At $0.05–$0.17 per score with 3 scores per IP per day, cost is minimal even at moderate traffic. This rate limit exists primarily to prevent abuse, not for cost control.

**Implementation:** Track by IP address in a `score_rate_limits` table. Check on submission. 24-hour rolling window.

**Edge case:** If someone clears cookies or uses a VPN, they can run another score. This is acceptable. They still provide their email each time, which is the real value.

---

## Database Schema

All new tables. No modifications to existing core platform tables.

### Table: `scores`

```sql
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  
  -- Lead info (always captured)
  email TEXT NOT NULL,
  name TEXT,
  company_name TEXT,
  
  -- Target product
  target_url TEXT NOT NULL,
  target_domain TEXT NOT NULL,
  
  -- Crawl data (stored for re-evaluation and debugging)
  crawl_data JSONB NOT NULL DEFAULT '{}',
  screenshots JSONB DEFAULT '[]',
  
  -- Evaluation results (structured)
  scores JSONB NOT NULL DEFAULT '{}',
  red_flag_deductions JSONB DEFAULT '[]',
  base_score INTEGER,
  total_deductions INTEGER DEFAULT 0,
  final_score INTEGER,
  classification TEXT,
  
  -- Full evaluation (the complete structured response from Claude)
  full_evaluation JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'crawling', 'evaluating', 'complete', 'failed')),
  error_message TEXT,
  processing_time_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  
  -- Future: link to company account if they sign up
  company_id UUID REFERENCES companies(id)
);

CREATE INDEX idx_scores_email ON scores(email);
CREATE INDEX idx_scores_slug ON scores(slug);
CREATE INDEX idx_scores_domain ON scores(target_domain);
CREATE INDEX idx_scores_status ON scores(status);
CREATE INDEX idx_scores_created ON scores(created_at DESC);
```

### Table: `score_rate_limits`

```sql
CREATE TABLE score_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  score_id UUID REFERENCES scores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_score_rate_limits_ip_date ON score_rate_limits(ip_address, created_at DESC);
```

### Table: `score_leads`

Denormalized lead tracking for sales follow-up. One row per unique email, updated on each score.

```sql
CREATE TABLE score_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  company_name TEXT,
  score_count INTEGER DEFAULT 1,
  domains_scored TEXT[] DEFAULT '{}',
  first_score_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latest_score_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Sales tracking
  follow_up_status TEXT DEFAULT 'new' CHECK (follow_up_status IN ('new', 'contacted', 'responded', 'converted', 'declined')),
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_score_leads_email ON score_leads(email);
CREATE INDEX idx_score_leads_status ON score_leads(follow_up_status);
```

### RLS Policies

```sql
-- Scores are publicly readable by slug (for shareable report URLs)
CREATE POLICY "Anyone can read scores by slug"
  ON scores FOR SELECT
  USING (status = 'complete');

-- Only the server (service role) can insert/update scores
-- All score creation happens via API routes, not client-side

-- Admin can read everything
CREATE POLICY "Admin full access to scores"
  ON scores FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin full access to leads"
  ON score_leads FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
```

---

## Structured Evaluation Output Schema

The Claude API call must return this exact JSON structure. This is what gets stored in `full_evaluation` and what the report page renders.

```json
{
  "product_name": "string",
  "target_url": "string",
  "score_date": "ISO date string",
  
  "scores": {
    "developer_recognition_signals": {
      "score": 0,
      "max": 10,
      "evidence": ["string"],
      "feedback": "string"
    },
    "value_proposition_clarity": {
      "score": 0,
      "max": 10,
      "evidence": ["string"],
      "feedback": "string"
    },
    "technical_credibility": {
      "score": 0,
      "max": 10,
      "evidence": ["string"],
      "feedback": "string"
    },
    "trust_social_proof": {
      "score": 0,
      "max": 10,
      "evidence": ["string"],
      "feedback": "string"
    },
    "integration_context": {
      "score": 0,
      "max": 10,
      "evidence": ["string"],
      "feedback": "string"
    },
    "documentation_quality": {
      "score": 0,
      "max": 10,
      "evidence": ["string"],
      "feedback": "string"
    },
    "technical_depth": {
      "score": 0,
      "max": 10,
      "evidence": ["string"],
      "feedback": "string"
    },
    "trial_accessibility": {
      "score": 0,
      "max": 10,
      "evidence": ["string"],
      "feedback": "string"
    },
    "developer_tooling": {
      "score": 0,
      "max": 10,
      "evidence": ["string"],
      "feedback": "string"
    },
    "developer_support_quality": {
      "score": 0,
      "max": 10,
      "evidence": ["string"],
      "feedback": "string"
    },
    "learning_resources": {
      "score": 0,
      "max": 10,
      "evidence": ["string"],
      "feedback": "string"
    },
    "product_cohesion": {
      "score": 0,
      "max": 10,
      "evidence": ["string"],
      "feedback": "string"
    }
  },
  
  "red_flags": [
    {
      "flag": "string (name of the red flag)",
      "deduction": -0,
      "developer_thinking": "string (what a developer would think)"
    }
  ],
  
  "critical_issues": [
    {
      "issue": "string",
      "impact": "string",
      "developer_behavior": "string (what developers do when they hit this)"
    }
  ],
  
  "summary": {
    "base_score": 0,
    "total_deductions": 0,
    "final_score": 0,
    "classification": "exceptional|excellent|good|needs_work|poor",
    "one_line_verdict": "string"
  },
  
  "quick_wins": [
    {
      "recommendation": "string",
      "impact": "string",
      "effort": "low|medium"
    }
  ],
  
  "strategic_opportunities": [
    {
      "area": "string",
      "current_gap": "string",
      "developer_impact": "string",
      "solution_approach": "string"
    }
  ],
  
  "what_ai_cant_tell_you": [
    "string (specific things only real developer testing would reveal)"
  ]
}
```

---

## Pages & Components

### Page: `/score` — Score Landing Page

**Route:** `app/score/page.tsx`

**Purpose:** URL input form + value proposition for the tool itself.

**Content:**
- Headline: "How developer-ready is your product?" (or similar, test variations)
- Subheadline: Brief explanation of what the score evaluates
- Form fields:
  - URL input (required, validated as URL)
  - Email input (required, validated as email)
  - Name input (optional)
  - Company name input (optional)
- Submit button: "Get My Score" or "Get My Score"
- Below form: brief explanation of the 12-category framework
- Social proof: "Based on insights from 100+ developer product evaluations"
- FAQ section addressing: What gets evaluated? How long does it take? Is it really free? What happens with my email?

**Client-side validation:**
- URL must start with https:// (auto-prepend if missing)
- URL must be a valid domain (not localhost, not IP address)
- Email must be valid format
- Rate limit check happens server-side on submit

### Page: `/score/[slug]` — Report Page

**Route:** `app/score/[slug]/page.tsx`

**Purpose:** Display the full evaluation report. This is the shareable URL.

**Layout:**
- Header with Built for Devs branding + "Developer Adoption Score" label
- Product name + URL + score date
- Overall score badge (large, visual, color-coded by classification)
- Score breakdown by category (12 categories, each with score bar + evidence + feedback)
- Red flags section (if any, with deduction amounts)
- Critical issues section (if any)
- Quick wins section (numbered, actionable)
- Strategic opportunities section
- **"What This Score Can't Tell You" section** — this is the bridge to paid evaluations. Lists specific things only real developer testing reveals. Ends with CTA: "See what real developers think about your product → Learn about Built for Devs evaluations"
- Footer CTA: "Want to improve your score? Run a Built for Devs evaluation with real developers."
- PDF download button
- "Score another product" link back to /score

**Open Graph / Meta Tags (critical for social sharing):**
- Title: "[Product Name] scored [X]/120 on the Developer Adoption Score"
- Description: "See how [Product Name] performs across 12 developer experience categories."
- Image: Auto-generated OG image showing the score (use @vercel/og or similar)

**Static generation:** Reports are static once generated. Use ISR or just server-render on first request and cache.

### Page: `/score/[slug]/loading` — Processing State

**Route:** `app/score/[slug]/loading.tsx` or handle within the page component

**Purpose:** Show progress while the score runs (crawling → evaluating → complete).

**UX:** 
- Animated progress indicator
- Status messages that update: "Crawling homepage..." → "Analyzing documentation..." → "Evaluating developer experience..." → "Generating your report..."
- Estimated time: "This usually takes 30-60 seconds"
- Do NOT let the user navigate away and lose their result. Use polling or SSE to check status.

**Implementation:** 
- On form submit, API creates the score record with status 'pending' and returns the slug
- Client redirects to /score/[slug] which shows loading state
- Client polls GET /api/score/[slug]/status every 3 seconds
- When status = 'complete', page re-renders with full report
- When status = 'failed', show error with retry option

---

## API Routes

### POST `/api/score`

**Purpose:** Accept score submission, validate, check rate limit, create record, trigger processing.

**Request body:**
```json
{
  "url": "https://example.com",
  "email": "user@company.com",
  "name": "Jane Doe",
  "company_name": "Acme Corp"
}
```

**Logic:**
1. Validate URL format and email format
2. Extract domain from URL
3. Get client IP from request headers (check x-forwarded-for for Vercel)
4. Check `score_rate_limits` for scores from this IP within last 24 hours; if 3 or more exist, reject
5. If rate-limited, return 429 with message
6. Generate unique slug (nanoid, 10 chars, URL-safe)
7. Insert score record with status 'pending'
8. Insert rate limit record
9. Upsert `score_leads` record (update if email exists, increment count, add domain)
10. Trigger background processing (see Background Processing below)
11. Return `{ slug: "abc123" }`

**Response:** `201 Created` with slug, or `429 Too Many Requests` if rate-limited.

### GET `/api/score/[slug]/status`

**Purpose:** Polling endpoint for the loading state.

**Response:**
```json
{
  "status": "pending|crawling|evaluating|complete|failed",
  "error_message": null
}
```

### GET `/api/score/[slug]`

**Purpose:** Return full score data for the report page (used by the page component for server-side rendering).

**Response:** Full score record including `full_evaluation` JSON.

### GET `/api/score/[slug]/pdf`

**Purpose:** Generate and return PDF version of the report.

**Implementation:** Use a headless browser approach (Puppeteer on serverless) or a library like `@react-pdf/renderer` to generate a styled PDF from the evaluation data. Cache the PDF after first generation.

---

## Background Processing Pipeline

The score processing runs as a background job triggered by the API route. On Vercel, use a serverless function with a longer timeout (set `maxDuration` in vercel.json) or use Vercel's background functions / cron if available. Alternatively, use Supabase Edge Functions or a simple queue.

### Recommended Approach: Vercel Serverless with Extended Timeout

Since scores are triggered by user action and results are polled, a single long-running serverless function works fine for MVP.

### Pipeline Steps

```
Step 1: Update score status → 'crawling'

Step 2: Crawl target URL
  - Use Firecrawl API (firecrawl.dev) or Jina Reader API (r.jina.ai)
  - Crawl homepage (required)
  - Follow and crawl: /docs, /documentation, /api, /pricing, /getting-started, /quickstart
  - Use the target URL's navigation to discover these paths if they're not at standard locations
  - Store raw markdown/text content per page in crawl_data JSONB
  - Cap total crawled content at ~15K tokens to stay within reasonable API costs
  - If crawl fails entirely, set status 'failed' with error message

Step 3: Capture screenshots
  - Use ScreenshotOne API or similar
  - Capture: homepage above-the-fold, documentation page (if found), pricing page (if found)
  - Store screenshot URLs in screenshots JSONB array
  - Screenshots are nice-to-have, not blocking. If capture fails, continue without them.

Step 4: Update score status → 'evaluating'

Step 5: Send to Claude API
  - Model: claude-sonnet-4-20250514
  - System prompt: The full evaluation framework (from the existing prompt document, adapted for structured output)
  - User message: Assembled crawl data with page labels
  - Response format: Request JSON matching the Structured Evaluation Output Schema defined above
  - Temperature: 0 (deterministic scoring)
  - Max tokens: 4096

Step 6: Parse and store results
  - Parse the JSON response
  - Extract base_score, total_deductions, final_score, classification into top-level columns
  - Store full response in full_evaluation
  - Store individual category scores in scores
  - Store red flags in red_flag_deductions
  - Update status → 'complete'
  - Set completed_at and processing_time_ms

Step 7: Error handling
  - If any step fails, set status → 'failed' with descriptive error_message
  - Log the full error for debugging
  - Common failures: URL unreachable, crawl timeout, Claude API rate limit, malformed JSON response
```

### Claude API Prompt Assembly

The user message sent to Claude should be structured like this:

```
You are evaluating the developer-facing product at [URL].

Here is the content crawled from their website:

## Homepage ([URL])
[crawled homepage content]

## Documentation ([docs URL if found])
[crawled docs content]

## Pricing ([pricing URL if found])
[crawled pricing content]

## Additional Pages
[any other crawled pages]

---

Evaluate this product using the Developer Adoption framework. Return your evaluation as a JSON object matching this exact schema:

[paste the JSON schema]

Important:
- Start from zero trust. Developers are skeptical by default.
- Score based only on what is present in the crawled content. Do not assume features exist if they're not shown.
- Be specific in evidence arrays. Quote or reference actual content from the pages.
- Apply all matching red flag deductions.
- The "what_ai_cant_tell_you" array should list 3-5 specific things that only real developer testing would reveal for THIS specific product.
```

The system prompt should contain the full evaluation framework, behavioral patterns, scoring rubric, and red flag definitions from the existing prompt document. Remove the output format section (since you're specifying JSON output) and the methodology notes (since the LLM doesn't need instructions on how to browse).

---

## Email Integration

### Transactional Email: Score Complete

Trigger: When score status changes to 'complete'

**Subject:** Your Developer Adoption Score: [Product Name] scored [X]/120

**Content:**
- Score summary with classification
- Top 3 quick wins (teaser)
- Link to full report
- CTA: "Want to know what real developers think? Learn about Built for Devs evaluations"

### Follow-up Sequence (via email marketing tool or manual for now)

- Day 3: "Did you get a chance to review your score? Here's what companies typically do next..."
- Day 7: "3 things the score can't tell you about [domain]" (bridges to paid eval)
- Day 14: "Companies that improved their DX score by 20+ points" (social proof / case studies)

For MVP, the follow-up sequence is manual. Store leads in `score_leads` and export for outreach. Automate in Phase 2 via Resend or similar.

---

## Admin Visibility

Add to the existing admin portal (Phase 2 of core platform build).

### Admin: Score Dashboard

**Route:** `app/admin/scores/page.tsx`

**Shows:**
- Total scores run (all time, this month, this week)
- Total unique emails captured
- Most-scored domains
- List of recent scores with: email, company, domain, score, date, status
- Filter by: date range, score range, classification, follow-up status
- Click through to view any score report

### Admin: Leads Dashboard

**Route:** `app/admin/score-leads/page.tsx`

**Shows:**
- All captured leads with: email, name, company, score count, domains scored, follow-up status
- Filter by: follow-up status, date range
- Inline edit: follow-up status, notes
- Export to CSV for outreach tools

---

## Build Phases

### Phase 1: Working MVP (Week 1-2)

**Goal:** Score tool is live, collecting emails, generating reports.

**Database:**
- [ ] Create `scores` table with all columns
- [ ] Create `score_rate_limits` table
- [ ] Create `score_leads` table
- [ ] Set up RLS policies
- [ ] Create indexes

**API Routes:**
- [ ] `POST /api/score` — submission, validation, rate limiting, record creation
- [ ] `GET /api/score/[slug]/status` — polling endpoint
- [ ] `GET /api/score/[slug]` — full score data

**Background Processing:**
- [ ] Web crawling integration (Firecrawl or Jina Reader — pick one, get API key)
- [ ] Claude API integration with evaluation prompt + structured JSON output
- [ ] Full pipeline: crawl → evaluate → store → mark complete
- [ ] Error handling and status updates throughout pipeline

**Pages:**
- [ ] `/score` — landing page with form
- [ ] `/score/[slug]` — report page with loading state and full report
- [ ] Score visualization components (score bars, classification badge)
- [ ] CTA sections linking to Built for Devs evaluations

**Email:**
- [ ] Send score-complete email via Resend (or whichever email service the core platform uses)

**No screenshots in Phase 1.** Get the core loop working first.

### Phase 2: Polish & Lead Capture (Week 3-4)

**Goal:** Reports are shareable, PDF works, admin can see leads.

- [ ] Screenshot capture integration (ScreenshotOne or similar)
- [ ] Screenshots embedded in report pages
- [ ] PDF generation and download
- [ ] Open Graph meta tags with dynamic OG image per report
- [ ] Admin score dashboard page
- [ ] Admin leads dashboard page with CSV export
- [ ] "Score your competitor" CTA on report pages (link back to /score with prefilled context)
- [ ] Loading state polish (animated progress, status messages)
- [ ] Mobile-responsive report page
- [ ] Analytics: track score submissions, report views, CTA clicks (use Vercel Analytics or simple event logging)

### Phase 3: Growth & Distribution (Month 2+)

**Goal:** The tool drives organic traffic and feeds the broader business.

- [ ] Public leaderboard page: `/score/leaderboard` — top-scoring developer tools (SEO play, linkable)
- [ ] "Re-score" feature: run the same URL again, show score comparison over time
- [ ] Embeddable badge: companies can add "Developer Adoption Score: X/120 — Scored by Built for Devs" to their site
- [ ] SEO landing pages: `/score/category/[category]` for "best developer tools for X" type queries
- [ ] Aggregate anonymized score data into Developer Trends product
- [ ] Automated follow-up email sequence (replace manual outreach)
- [ ] API access for agencies/consultants to run scores programmatically (potential revenue stream)
- [ ] A/B test landing page headlines and CTAs

---

## Environment Variables Required

```
# Crawling (pick one)
FIRECRAWL_API_KEY=
# or
JINA_API_KEY=

# Screenshots (Phase 2)
SCREENSHOTONE_API_KEY=

# Claude API
ANTHROPIC_API_KEY=

# Existing (already configured for core platform)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Crawling service | Firecrawl (primary recommendation) | Returns clean markdown, handles JS-rendered pages, generous free tier, simple API. Jina Reader is the backup option. |
| LLM | Claude Sonnet | Best balance of cost and quality for structured evaluation. Haiku would be cheaper but may not produce nuanced enough scoring evidence. |
| Screenshot capture | ScreenshotOne | Simple API, cheap, reliable. Defer to Phase 2. |
| Rate limiting | IP-based, 3 per day | Simple, prevents abuse. Email is always captured regardless. |
| Report URLs | Slug-based, permanently accessible | Shareability is a growth mechanism. Never expire reports. |
| PDF generation | @react-pdf/renderer or Puppeteer | Decide during Phase 2 based on report complexity. |
| Processing model | Single serverless function with polling | Simplest approach for MVP. Move to queue-based if volume demands it. |
| Evaluation prompt | Stored as a constant in codebase, not in DB | Easier to version control and iterate. Move to DB if you want A/B testing later. |

---

## Prompt Iteration Notes

The evaluation prompt (the document uploaded to this project) needs these modifications for automated use:

1. **Remove browsing simulation language.** The current prompt assumes a human navigating a website. Replace with: "Based on the crawled content provided, evaluate..."

2. **Add structured output instructions.** Explicitly tell the model to return only valid JSON matching the schema. No markdown, no preamble, no explanation outside the JSON.

3. **Add content-awareness instructions.** Tell the model: "You can only evaluate what is present in the provided content. If documentation was not crawled or not found, score documentation categories based on whether documentation links are visible in navigation, but note that content was not available for deep evaluation."

4. **Calibrate the "What AI Can't Tell You" section.** This is the most important section for conversion. Prompt the model to generate 3-5 product-specific observations that only real developer testing would uncover. Examples: "Whether the onboarding flow actually works end-to-end," "How error messages behave when you send malformed input," "Whether the SDK handles edge cases your docs don't mention."

5. **Add classification thresholds.** Include the exact score ranges in the prompt so classification is deterministic:
   - 95-120: exceptional
   - 85-94: excellent
   - 70-84: good
   - 55-69: needs_work
   - <55: poor

6. **Temperature 0.** Use temperature 0 for consistent, reproducible scoring. Same URL should produce similar scores on re-evaluation.

---

## Success Metrics

**Phase 1 (first 30 days):**
- Score tool is live and functional
- 50+ scores completed
- 50+ unique email leads captured
- Reports are generating accurate, useful scores

**Phase 2 (days 30-60):**
- Reports are being shared on social media (track OG image loads)
- PDF downloads happening
- 3+ leads converted to evaluation conversations
- Admin dashboard providing useful lead visibility

**Phase 3 (days 60-90):**
- 200+ total scores
- Leaderboard driving organic search traffic
- Re-score feature showing score improvements
- At least 1 paid evaluation directly attributed to score tool lead