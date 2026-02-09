# Built for Devs — Data Model & Schema Blueprint

**Purpose:** This document defines every table, field, relationship, and enum for the Built for Devs MVP. Use this as the source of truth when building with Claude Code + Next.js + Supabase.

**Stack:** Next.js, Supabase (Postgres + Auth + RLS), Stripe Checkout, ClarityFlow API

---

## Architecture Notes

### Supabase Auth
Supabase handles authentication. Every user (developer, company contact, admin) gets a record in `auth.users`. Our `profiles` table extends this with role info and links to either `developers` or `company_contacts`.

### Multi-select Fields
Fields like programming languages, frameworks, and tools are stored as Postgres arrays (`text[]`). This keeps the schema simple, avoids join-table sprawl for MVP, and Supabase/Postgres handles array queries well (`@>`, `&&` operators). If you need relational normalization later (e.g., for a taxonomy UI), you can migrate without changing the app layer much.

### Enums vs. Lookup Tables
For fixed, small sets (seniority levels, project statuses), we use Postgres enums. For larger evolving sets (industries, product categories), we use text arrays and validate at the application layer. This keeps migrations simple and avoids enum-alteration headaches in Postgres.

---

## Table: `profiles`

Links Supabase auth to our application roles. Every authenticated user has exactly one profile.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, PK | Same as `auth.users.id` |
| `email` | text, unique, not null | |
| `full_name` | text, not null | |
| `role` | enum: `developer`, `company`, `admin` | Determines which portal they see |
| `avatar_url` | text, nullable | |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Auto-updated via trigger |

**RLS:** Users can read/update their own profile. Admins can read all.

---

## Table: `developers`

The core profile for ICP matching. Every field here maps to something a company can filter on when defining their ICP criteria.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, PK | Default `gen_random_uuid()` |
| `profile_id` | uuid, FK → profiles.id, unique | One-to-one with profiles |
| **Professional Identity** | | |
| `job_title` | text | Free text, their actual title |
| `role_types` | text[] | `['backend', 'full-stack', 'devops']` — multi-select from defined list |
| `years_experience` | integer | Total years of professional dev experience |
| `seniority` | enum: `junior`, `mid`, `senior`, `staff`, `principal`, `lead`, `manager`, `director`, `vp_plus` | |
| `current_company` | text, nullable | Company name |
| `company_size` | enum: `1-10`, `11-50`, `51-200`, `201-1000`, `1001-5000`, `5000+` | |
| `industries` | text[] | `['fintech', 'saas', 'e-commerce']` |
| **Technical Profile** | | |
| `languages` | text[] | `['typescript', 'python', 'go']` |
| `frameworks` | text[] | `['react', 'next.js', 'django']` |
| `databases` | text[] | `['postgresql', 'mongodb', 'redis']` |
| `cloud_platforms` | text[] | `['aws', 'gcp', 'azure']` |
| `devops_tools` | text[] | `['docker', 'kubernetes', 'terraform']` |
| `cicd_tools` | text[] | `['github-actions', 'jenkins', 'circleci']` |
| `testing_frameworks` | text[] | `['jest', 'pytest', 'cypress']` |
| `api_experience` | text[] | `['rest', 'graphql', 'grpc']` |
| `operating_systems` | text[] | `['macos', 'linux', 'windows']` |
| **Development Context** | | |
| `team_size` | integer, nullable | Size of their dev team |
| `buying_influence` | enum: `individual_contributor`, `team_influencer`, `decision_maker`, `budget_holder` | |
| `paid_tools` | text[] | Tools/products they currently pay for |
| `open_source_activity` | enum: `none`, `occasional`, `regular`, `maintainer` | |
| **Online Profiles** | | |
| `linkedin_url` | text, nullable | |
| `github_url` | text, nullable | |
| `twitter_url` | text, nullable | |
| `website_url` | text, nullable | |
| `other_links` | text[], nullable | Additional relevant URLs |
| **Demographics & Logistics** | | |
| `country` | text | |
| `state_region` | text, nullable | |
| `timezone` | text | IANA timezone string |
| `preferred_eval_times` | text[], nullable | `['mornings', 'evenings', 'weekends']` |
| `paypal_email` | text, nullable | Required before first payout, not required at signup |
| **Platform Meta** | | |
| `is_available` | boolean | Default `true` — can be toggled by dev or admin |
| `profile_complete` | boolean | Default `false` — computed or manually set |
| `quality_rating` | decimal(3,2), nullable | Running avg from admin quality reviews (1.00–5.00) |
| `total_evaluations` | integer | Default `0` — denormalized counter |
| `response_rate` | decimal(3,2), nullable | % of invitations accepted |
| `imported` | boolean | Default `false` — flag for pre-existing developers you import |
| `import_source` | text, nullable | Where they were imported from |
| `admin_notes` | text, nullable | Private notes only you can see |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**RLS:** Developers can read/update their own record. Admins can read/update all. Companies NEVER have direct access to this table.

**Indexes:**
- `role_types` (GIN) — for array containment queries
- `languages` (GIN)
- `frameworks` (GIN)
- `industries` (GIN)
- `cloud_platforms` (GIN)
- `seniority`
- `years_experience`
- `company_size`
- `is_available`
- `buying_influence`

---

## Table: `company_contacts`

The person at the company who manages projects. A company can have multiple contacts eventually, but MVP = one contact per company.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, PK | |
| `profile_id` | uuid, FK → profiles.id, unique | |
| `company_id` | uuid, FK → companies.id | |
| `role_at_company` | text, nullable | Their job title |
| `is_primary` | boolean | Default `true` |
| `created_at` | timestamptz | |

---

## Table: `companies`

The company entity, separate from the individual contact.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, PK | |
| `name` | text, not null | |
| `website` | text, nullable | |
| `industry` | text, nullable | |
| `size` | text, nullable | |
| `stripe_customer_id` | text, nullable | Set after first Stripe checkout |
| `admin_notes` | text, nullable | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**RLS:** Company contacts can read their own company. Admins can read/update all.

---

## Table: `projects`

A company's evaluation request. This is the core business object — companies create projects, pay for them, developers get assigned to them.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, PK | |
| `company_id` | uuid, FK → companies.id | |
| `created_by` | uuid, FK → company_contacts.id | Which contact created it |
| `status` | enum: `draft`, `pending_payment`, `paid`, `matching`, `in_progress`, `evaluations_complete`, `report_drafting`, `delivered`, `closed` | |
| **Product Info** | | |
| `product_name` | text, not null | |
| `product_url` | text, nullable | |
| `product_category` | text | `'api'`, `'sdk'`, `'cli'`, `'saas'`, etc. |
| `product_description` | text | |
| `evaluation_scope` | text | What specifically to evaluate |
| `setup_instructions` | text, nullable | Access credentials, setup steps |
| `time_to_value_milestone` | text, nullable | What "reaching value" looks like |
| **Evaluation Goals** | | |
| `goals` | text[] | `['messaging_validation', 'pmf_assessment', 'dx_assessment']` |
| **ICP Criteria** | | |
| `icp_role_types` | text[] | Required role types |
| `icp_min_experience` | integer, nullable | Minimum years |
| `icp_seniority_levels` | text[] | Acceptable seniority levels |
| `icp_languages` | text[] | Required languages/frameworks/tools |
| `icp_frameworks` | text[] | |
| `icp_company_size_range` | text[] | Acceptable company sizes |
| `icp_industries` | text[] | |
| `icp_databases` | text[] | |
| `icp_cloud_platforms` | text[] | |
| `icp_devops_tools` | text[] | |
| `icp_cicd_tools` | text[] | |
| `icp_testing_frameworks` | text[] | |
| `icp_api_experience` | text[] | |
| `icp_operating_systems` | text[] | |
| `icp_team_size_range` | text[] | Acceptable team size brackets |
| `icp_buying_influence` | text[] | Acceptable levels |
| `icp_paid_tools` | text[] | Products they should currently use |
| `icp_open_source_activity` | text[] | Acceptable activity levels |
| **Project Parameters** | | |
| `num_evaluations` | integer, not null | How many developers they want |
| `price_per_evaluation` | integer | Default `399` (in dollars, store cents if you prefer) |
| `total_price` | integer | `num_evaluations * price_per_evaluation` |
| `preferred_timeline` | text, nullable | |
| **Payment** | | |
| `stripe_checkout_session_id` | text, nullable | |
| `stripe_payment_intent_id` | text, nullable | |
| `paid_at` | timestamptz, nullable | |
| **Findings Report** | | |
| `findings_report` | text, nullable | Rich text / markdown — you write this in admin |
| `report_published` | boolean | Default `false` |
| `report_published_at` | timestamptz, nullable | |
| **Meta** | | |
| `admin_notes` | text, nullable | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**RLS:** Company contacts can read their own company's projects. Admins can read/update all. Developers NEVER see project details directly (only via their evaluation assignment).

**Indexes:**
- `company_id`
- `status`
- `created_at`

---

## Table: `evaluations`

The join between a project and a developer. This is where the work happens — invitation, acceptance, recording, review, payment.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, PK | |
| `project_id` | uuid, FK → projects.id | |
| `developer_id` | uuid, FK → developers.id | |
| `status` | enum: `invited`, `accepted`, `declined`, `expired`, `recording`, `submitted`, `in_review`, `approved`, `rejected`, `paid` | |
| **Invitation** | | |
| `invited_at` | timestamptz | When invitation was sent |
| `invitation_expires_at` | timestamptz | `invited_at + 24 hours` |
| `responded_at` | timestamptz, nullable | When they accepted/declined |
| **Recording** | | |
| `recording_deadline` | timestamptz, nullable | Set on acceptance (`accepted_at + 3-4 days`) |
| `clarityflow_conversation_id` | text, nullable | ClarityFlow API reference |
| `recording_embed_url` | text, nullable | Pulled from ClarityFlow after completion |
| `recording_completed_at` | timestamptz, nullable | |
| `transcript` | text, nullable | Full transcript from ClarityFlow |
| **Review** | | |
| `admin_quality_score` | decimal(3,2), nullable | 1.00–5.00 |
| `admin_review_notes` | text, nullable | |
| `reviewed_at` | timestamptz, nullable | |
| **Payment** | | |
| `payout_amount` | integer, nullable | $149–$199 based on seniority |
| `payout_method` | text, nullable | `'paypal_manual'` for MVP, `'paypal_api'` later |
| `paid_at` | timestamptz, nullable | |
| `payout_reference` | text, nullable | PayPal transaction ID or note |
| **Anonymized Display** | | |
| `anonymous_descriptor` | text, nullable | Generated: "Senior Backend Engineer, 8 yrs, fintech, 200-person company" |
| **Meta** | | |
| `admin_notes` | text, nullable | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Unique constraint:** `(project_id, developer_id)` — a developer can only be assigned once per project.

**RLS:**
- Developers can read their own evaluations (filtered by `developer_id`) — limited to: `id`, `project_id`, `status`, `recording_deadline`, `clarityflow_conversation_id`, `payout_amount`, `paid_at`. They need this for: seeing invitation status, accessing the ClarityFlow embed, and tracking payment. Developers can update status from `invited` → `accepted` or `invited` → `declined` only.
- Company contacts can read evaluations for their projects, but ONLY: `id`, `project_id`, `status`, `anonymous_descriptor`, `recording_embed_url`, `transcript`, `recording_completed_at` — NEVER `developer_id` or anything that identifies the developer.
- Admins can read/update all fields.

**Indexes:**
- `project_id`
- `developer_id`
- `status`
- `invited_at`

---

## Table: `email_notifications`

Tracks what's been sent. MVP can be simple — just log that you sent it. Actual sending can be via Supabase Edge Functions + Resend/SendGrid.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid, PK | |
| `recipient_email` | text | |
| `recipient_profile_id` | uuid, FK → profiles.id, nullable | |
| `type` | text | `'invitation'`, `'acceptance_confirmation'`, `'deadline_reminder'`, `'payment_confirmation'`, `'evaluation_ready'`, `'report_ready'` |
| `related_evaluation_id` | uuid, FK → evaluations.id, nullable | |
| `related_project_id` | uuid, FK → projects.id, nullable | |
| `sent_at` | timestamptz | |
| `status` | text | `'sent'`, `'failed'` |

**Note:** For MVP, this table is optional. You can add it when you automate emails. Initially you might just send emails manually or via a simple Edge Function without logging.

---

## Enums Reference

These are the Postgres enums to create in your migration:

```
-- User roles
CREATE TYPE user_role AS ENUM ('developer', 'company', 'admin');

-- Developer seniority
CREATE TYPE seniority_level AS ENUM (
  'junior', 'mid', 'senior', 'staff', 'principal',
  'lead', 'manager', 'director', 'vp_plus'
);

-- Company size brackets
CREATE TYPE company_size AS ENUM (
  '1-10', '11-50', '51-200', '201-1000', '1001-5000', '5000+'
);

-- Buying influence
CREATE TYPE buying_influence_level AS ENUM (
  'individual_contributor', 'team_influencer',
  'decision_maker', 'budget_holder'
);

-- Open source activity
CREATE TYPE oss_activity AS ENUM (
  'none', 'occasional', 'regular', 'maintainer'
);

-- Project status
CREATE TYPE project_status AS ENUM (
  'draft', 'pending_payment', 'paid', 'matching',
  'in_progress', 'evaluations_complete',
  'report_drafting', 'delivered', 'closed'
);

-- Evaluation status
CREATE TYPE evaluation_status AS ENUM (
  'invited', 'accepted', 'declined', 'expired',
  'recording', 'submitted', 'in_review',
  'approved', 'rejected', 'paid'
);
```

---

## Relationships Diagram (Text)

```
profiles (1) ——— (1) developers
profiles (1) ——— (1) company_contacts
company_contacts (many) ——— (1) companies
companies (1) ——— (many) projects
projects (1) ——— (many) evaluations
developers (1) ——— (many) evaluations
```

---

## Key Design Decisions & Rationale

### Why `text[]` arrays instead of join tables for skills/tools?
For MVP speed. Postgres array operators (`@>` for "contains all", `&&` for "overlaps any") handle ICP matching queries efficiently. A company says "must know TypeScript and React" → `WHERE developers.languages @> ARRAY['typescript'] AND developers.frameworks @> ARRAY['react']`. When you add the matching algorithm later, these same queries become the foundation. If you ever need a normalized taxonomy (e.g., "React" and "React.js" are the same thing), you can add lookup tables and migrate the arrays.

### Why separate `companies` and `company_contacts`?
A company might have multiple people using the platform eventually — a PM creates the project, a marketing lead reviews the report. Even for MVP where it's 1:1, this separation means you never have to restructure when a second person at the same company signs up.

### Why store `anonymous_descriptor` on the evaluation?
It's generated once when the evaluation is created (from the developer's profile at that moment) and never changes. This means if a developer updates their profile later, the descriptor for past evaluations stays accurate to what they were when they did the evaluation. It also makes the company-facing query simple — no need to join to developers.

### Why `findings_report` as a text field on projects?
For MVP, you're writing reports manually. A rich text / markdown field you can edit from your admin panel is the simplest possible approach. When you want structured reports with sections, embedded timestamps, and PDF generation, you can add a `report_sections` table. But don't build that until you need it.

### Why track `payout_method` even for manual payments?
So when you automate PayPal payouts later, you have a clean migration path. Records with `paypal_manual` were handled by you; records with `paypal_api` went through the API. Clean audit trail from day one.

---

## What This Doesn't Include (Yet)

These are intentionally deferred. Build them when you need them:

- **Matching algorithm / match scores** — For MVP, you query developers manually using the GIN indexes. When ready, add a `match_candidates` table with scores.
- **PDF export** — Use browser print-to-PDF or build a proper export when clients request it.
- **PayPal API integration** — Track manual payments in the `evaluations` table, automate later.
- **ClarityFlow webhook handling** — Poll or check manually, add webhooks when volume warrants it.
- **Email automation** — Send manually or via simple functions, formalize later.
- **Developer availability calendar** — `is_available` boolean is sufficient for MVP.
- **Invitation batching / queuing** — Manually invite through admin for now.

---

## Getting Started with Claude Code

When you sit down with Claude Code, your first prompt should be something like:

> "I'm building a Next.js app with Supabase. Here's my data model: [paste this doc or reference it]. Start by creating the Supabase migration file with all tables, enums, indexes, and RLS policies. Then scaffold the Next.js project with authentication using Supabase Auth and role-based routing (developer portal, company portal, admin portal)."

This gives Claude Code the full context to generate a solid foundation in one shot, rather than building piecemeal and having to restructure.