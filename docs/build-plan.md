# Built for Devs — MVP Build Plan

**Stack:** Next.js 14 (App Router), Supabase (Postgres + Auth + RLS), Vercel, Stripe Checkout, Tailwind CSS, shadcn/ui, ClarityFlow API

**Approach:** Build with Claude Code. Each phase is a self-contained chunk that results in something testable. Don't move to the next phase until the current one works.

---

## Phase 0: Project Setup
**Time estimate: 1 session**

### 0.1 Initialize the project
- Create Next.js 14 app with App Router, TypeScript, Tailwind CSS
- Install and configure shadcn/ui
- Initialize Supabase project (free tier)
- Connect Supabase to Next.js via `@supabase/ssr`
- Set up environment variables (Supabase URL, anon key, service role key)
- Initialize Git repo, push to GitHub
- Connect GitHub repo to Vercel for auto-deploy
- Verify: app deploys to Vercel, shows a blank page, no errors

### 0.2 Project structure
```
src/
  app/
    (auth)/          ← login, signup, forgot-password
    (dev)/           ← developer portal
    (company)/       ← company portal
    (admin)/         ← admin portal
    api/             ← API routes (Stripe webhooks, etc.)
  components/
    ui/              ← shadcn components
    shared/          ← shared components (status badges, etc.)
  lib/
    supabase/        ← client, server, middleware helpers
    stripe/          ← Stripe helpers
    utils/           ← general utilities
  types/             ← TypeScript types matching DB schema
```

### 0.3 Middleware for route protection
- Supabase auth middleware that checks session on every request
- Role-based routing: developers can only access `/dev/*`, companies only `/company/*`, admin only `/admin/*`
- Unauthenticated users redirect to login
- After login, redirect to appropriate portal based on role

---

## Phase 1: Database & Auth
**Time estimate: 1-2 sessions**

### 1.1 Supabase migration — enums
Create all enums first since tables depend on them:

```sql
CREATE TYPE user_role AS ENUM ('developer', 'company', 'admin');
CREATE TYPE seniority_level AS ENUM ('early_career', 'senior', 'leadership');
CREATE TYPE company_size AS ENUM ('1-10', '11-50', '51-200', '201-1000', '1001-5000', '5000+');
CREATE TYPE buying_influence_level AS ENUM ('individual_contributor', 'team_influencer', 'decision_maker', 'budget_holder');
CREATE TYPE oss_activity AS ENUM ('none', 'occasional', 'regular', 'maintainer');
CREATE TYPE project_status AS ENUM ('draft', 'pending_payment', 'paid', 'matching', 'in_progress', 'evaluations_complete', 'report_drafting', 'delivered', 'closed');
CREATE TYPE evaluation_status AS ENUM ('invited', 'accepted', 'declined', 'expired', 'recording', 'submitted', 'in_review', 'approved', 'rejected', 'paid');
```

### 1.2 Supabase migration — tables
Create in this order (respects foreign keys):

1. `profiles` — id (uuid, PK, matches auth.users.id), email, full_name, role (user_role), avatar_url, created_at, updated_at
2. `developers` — all fields from data model doc (professional identity, technical profile, development context, online profiles, demographics, platform meta)
3. `companies` — id, name, website, industry, size, stripe_customer_id, admin_notes, timestamps
4. `company_contacts` — id, profile_id (FK profiles), company_id (FK companies), role_at_company, is_primary, created_at
5. `projects` — all fields from data model doc (product info, evaluation goals, ALL ICP criteria fields, project parameters, payment fields, findings report fields, meta)
6. `evaluations` — all fields from data model doc (invitation, recording, review, payment, anonymous_descriptor, meta). Unique constraint on (project_id, developer_id).

### 1.3 ICP criteria fields on projects — COMPLETE LIST
Every developer profile attribute gets a corresponding ICP field. No exceptions:

| Developer field | Project ICP field | Type |
|---|---|---|
| role_types | icp_role_types | text[] |
| years_experience | icp_min_experience | integer |
| seniority | icp_seniority_levels | text[] |
| company_size | icp_company_size_range | text[] |
| industries | icp_industries | text[] |
| languages | icp_languages | text[] |
| frameworks | icp_frameworks | text[] |
| databases | icp_databases | text[] |
| cloud_platforms | icp_cloud_platforms | text[] |
| devops_tools | icp_devops_tools | text[] |
| cicd_tools | icp_cicd_tools | text[] |
| testing_frameworks | icp_testing_frameworks | text[] |
| api_experience | icp_api_experience | text[] |
| operating_systems | icp_operating_systems | text[] |
| team_size | icp_team_size_range | text[] |
| buying_influence | icp_buying_influence | text[] |
| paid_tools | icp_paid_tools | text[] |
| open_source_activity | icp_open_source_activity | text[] |

### 1.4 Indexes
GIN indexes on ALL text[] columns on `developers` table (role_types, languages, frameworks, databases, cloud_platforms, devops_tools, cicd_tools, testing_frameworks, api_experience, operating_systems, industries, paid_tools).

Standard indexes on: developers.seniority, developers.years_experience, developers.company_size, developers.is_available, developers.buying_influence, projects.company_id, projects.status, evaluations.project_id, evaluations.developer_id, evaluations.status.

### 1.5 Row-Level Security policies

**profiles:**
- SELECT: users can read their own profile. Admins can read all.
- UPDATE: users can update their own profile. Admins can update all.

**developers:**
- SELECT: developer can read their own record (where profile_id = auth.uid()). Admins can read all. Companies have NO access.
- UPDATE: developer can update their own record. Admins can update all.
- INSERT: triggered on signup when role = developer.

**companies:**
- SELECT: company_contacts can read their own company. Admins can read all.
- UPDATE: admins only.

**company_contacts:**
- SELECT: user can read their own record. Admins can read all.

**projects:**
- SELECT: company_contacts can read projects where company_id matches their company. Admins can read all. Developers have NO access.
- INSERT: company_contacts can create projects for their company.
- UPDATE: admins only (status changes, report publishing, etc.)

**evaluations:**
- SELECT: admins can read all fields. Company_contacts can read evaluations for their projects BUT only these columns: id, project_id, status, anonymous_descriptor, recording_embed_url, transcript, recording_completed_at, payout_amount (NOT developer_id). Developers can read their own evaluations (where developer_id matches) for: id, project_id, status, recording_deadline, clarityflow_conversation_id, payout_amount, paid_at.
- INSERT: admins only (they assign developers to projects).
- UPDATE: admins can update all. Developers can update status from invited→accepted or invited→declined only.

### 1.6 Auth trigger
Create a Postgres function + trigger: when a new user signs up via Supabase Auth, automatically create a row in `profiles` with their email, name, and role. The role should come from user metadata passed during signup.

### 1.7 Auth UI
- `/login` — email + password login via Supabase Auth
- `/signup` — registration form with role selection (developer or company). Admin accounts created manually in Supabase.
- `/forgot-password` — Supabase password reset flow
- After login, redirect based on role in profiles table

### 1.8 Verify
- Can sign up as developer → lands on `/dev/profile`
- Can sign up as company → lands on `/company/projects`
- Can log in as admin (manually created) → lands on `/admin/dashboard`
- Cross-portal access blocked by middleware
- All tables exist in Supabase with correct types and constraints

---

## Phase 2: Admin Portal
**Time estimate: 3-4 sessions**

Build admin first because everything else depends on you being able to manage data.

### 2.1 Admin layout
- Sidebar navigation: Dashboard, Developers, Projects, Evaluations, Companies
- Top bar with admin user info and logout

### 2.2 Admin Dashboard (`/admin/dashboard`)
- Stats cards: total developers (and how many profile_complete), total companies, active projects by status, evaluations needing review, evaluations approved but unpaid
- "Needs Attention" section: projects in `paid` status (need developer assignment), evaluations in `submitted` status (need review), evaluations in `approved` status (need payment logged)
- Keep it functional, not fancy

### 2.3 Admin Developers List (`/admin/developers`)
THIS IS THE MOST IMPORTANT ADMIN PAGE.

- Filterable by EVERY developer profile attribute:
  - Role types (multi-select)
  - Seniority (multi-select)
  - Years of experience (min/max range)
  - Languages (multi-select)
  - Frameworks (multi-select)
  - Databases (multi-select)
  - Cloud platforms (multi-select)
  - DevOps tools (multi-select)
  - CI/CD tools (multi-select)
  - Testing frameworks (multi-select)
  - API experience (multi-select)
  - Operating systems (multi-select)
  - Industries (multi-select)
  - Company size (multi-select)
  - Buying influence (multi-select)
  - Paid tools (multi-select)
  - Open source activity (multi-select)
  - Availability (boolean toggle)
- Text search across name, company, job title
- Results show: name, role types, seniority, years experience, key languages, company, availability badge, quality rating, total evaluations
- Click through to developer detail
- Pagination

### 2.4 Admin Developer Detail (`/admin/developers/[id]`)
- Full profile view (all fields, organized by section)
- Editable admin_notes field
- Quality rating display (and manual override)
- Stats: total evaluations, response rate, breakdown by status
- Evaluation history list with links to evaluation detail
- Availability toggle

### 2.5 Admin Developer Import (`/admin/developers/import`)
- CSV upload
- Column mapping UI (map CSV columns to developer profile fields)
- Preview imported data before confirming
- Sets `imported = true` and `import_source` on created records
- Creates profiles with temporary passwords or magic link invitations
- Handles partial profiles gracefully (sets `profile_complete = false`)

### 2.6 Admin Projects List (`/admin/projects`)
- Filterable by status
- Shows: project name, company name, product name, status, evaluations progress (e.g., "3/5 complete"), created date
- Click through to project detail

### 2.7 Admin Project Detail (`/admin/projects/[id]`)
This is your primary workspace for each engagement:

**Project info section:**
- All project details (product info, goals, ICP criteria) — read-only view
- Company info with link to company
- Status management (dropdown to change project status)

**Developer assignment section:**
- "Assign Developers" button that opens the developer search/filter (reuse the filter UI from admin developers list)
- List of assigned developers with their status in this evaluation
- For each: name (visible to you), anonymous descriptor preview, evaluation status, actions (invite, remove)

**Evaluations section:**
- List of all evaluations for this project
- Each shows: developer name (admin sees this), anonymous descriptor, status, recording link (if submitted), quality score (if reviewed)
- Click into evaluation to review

**Findings report section:**
- Markdown editor (use a simple markdown editor component)
- Save draft button
- Publish button (sets report_published = true, report_published_at = now)
- Preview toggle to see rendered markdown

**Payment tracking section:**
- List of evaluations in approved status needing payment
- For each: developer name, PayPal email, payout amount
- "Log Payment" button per evaluation — sets paid_at, payout_reference (you enter the PayPal transaction ID)

### 2.8 Admin Evaluations List (`/admin/evaluations`)
- Filterable by status (most useful: "submitted" for review queue, "approved" for payment queue)
- Shows: developer name, project name, company name, status, submitted date
- Click through to evaluation detail (which is on the project detail page, or a standalone page)

### 2.9 Admin Companies List (`/admin/companies`)
- Simple list: company name, website, number of projects, total spend
- Click through shows company info and list of their projects

### 2.10 Verify
- Can see dashboard stats
- Can search/filter developers by every attribute
- Can create a test project manually and assign developers
- Can view and change evaluation statuses
- Can write and publish a findings report
- Can log a manual payment

---

## Phase 3: Developer Portal
**Time estimate: 2-3 sessions**

### 3.1 Developer layout
- Simple top nav: Profile, Evaluations, Logout
- Clean, minimal — developers don't want to explore a platform

### 3.2 Developer Profile (`/dev/profile`)
**First visit (onboarding flow):**
- Multi-step form, one section per step:
  1. Professional Identity — job title, role types (multi-select), years experience, seniority, current company, company size, industries
  2. Technical Profile — languages, frameworks, databases, cloud platforms, devops tools, CI/CD tools, testing frameworks, API experience, operating systems
  3. Development Context — team size, buying influence, paid tools, open source activity
  4. Online Profiles — LinkedIn, GitHub, Twitter, website, other links
  5. Demographics — country, state/region, timezone, preferred eval times, PayPal email
- Progress bar across the top
- "Save & Continue" and "Back" buttons per step
- On completion, set `profile_complete = true`

**Return visits:**
- Standard form view with all sections visible and editable
- Collapsible sections or tabs
- Save button per section or global save
- Profile completeness indicator if anything is missing

**Field types:**
- Multi-select fields (languages, frameworks, etc.) should use a tag-input or combobox component — type to search, click to add, shows selected as chips/tags
- This is important because there are hundreds of possible values for languages/frameworks/tools. Don't use dropdowns with 200 options. Use searchable tag inputs.

### 3.3 Developer Evaluations List (`/dev/evaluations`)
- Cards or rows showing their evaluations
- Each shows: product name, status badge, deadline (if recording), payout amount (if approved/paid), date
- Sorted by most recent
- Status badges with clear meaning: "Recording — due Mar 15", "Under Review", "Approved — Payment Queued", "Paid — $175"

### 3.4 Developer Evaluation Detail (`/dev/evaluations/[id]`)
Three zones:

**Assignment context (top):**
- Product name and description
- What to evaluate (evaluation_scope from project)
- Setup instructions / credentials
- Time-to-value milestone
- Evaluation goals

**ClarityFlow embed (middle):**
- Embedded ClarityFlow conversation
- Always visible, always functional, never removed
- Uses clarityflow_conversation_id from the evaluation record

**Status bar (bottom):**
- Dynamic based on evaluation status:
  - `accepted`/`recording`: "Complete your evaluation by [recording_deadline]"
  - `submitted`: "Thanks! Your evaluation is under review."
  - `in_review`: "Your evaluation is being reviewed."
  - `approved`: "Approved! Payment of $[payout_amount] has been queued." (If no PayPal email: "Approved! Add your PayPal email in your profile to receive payment.")
  - `paid`: "Payment of $[payout_amount] sent to your PayPal on [paid_at date]."

### 3.5 Invitation handling
When you (admin) assign a developer and set status to `invited`:
- Developer sees the evaluation appear in their list with "Invited" status and expiration time
- Evaluation detail page shows accept/decline buttons
- Accept: status → `accepted`, recording_deadline set, ClarityFlow conversation created
- Decline: status → `declined`
- After invitation_expires_at: status → `expired` (handle via Supabase cron or check on page load)

### 3.6 Verify
- New developer can sign up and complete full profile
- Profile completeness is tracked
- Developer can see evaluations in their list
- Developer can accept/decline invitations
- ClarityFlow embed renders on evaluation detail
- Status bar updates correctly through all states

---

## Phase 4: Company Portal
**Time estimate: 2-3 sessions**

### 4.1 Company layout
- Top nav: Projects, Account, Logout
- Clean and professional

### 4.2 Company onboarding
- After signup, prompt to create their company (name, website, industry, size)
- Creates company + company_contact records
- Redirect to projects dashboard

### 4.3 Company Projects Dashboard (`/company/projects`)
- Cards or rows for each project
- Each shows: project name, product name, status badge, evaluation progress ("3 of 5 complete"), created date
- "New Project" button prominently placed
- Empty state for first-time: "Create your first evaluation project"

### 4.4 Company New Project (`/company/projects/new`)
Multi-step wizard:

**Step 1 — Product Information:**
- Product name (text)
- Product URL (text)
- Product category (select from defined list)
- Product description (textarea)
- What to evaluate (textarea)
- Setup instructions (textarea)
- Time-to-value milestone (textarea)

**Step 2 — Evaluation Goals:**
- Multi-select checkboxes from the defined list: messaging validation, PMF assessment, feature feedback, documentation review, onboarding flow evaluation, DX assessment, competitive comparison, pricing perception, API/SDK usability, time-to-first-value measurement

**Step 3 — Target Developer Profile (ICP Criteria):**
- This mirrors the developer profile structure but as filter criteria
- Each field is optional — companies only fill in what matters for their ICP
- Required role types (multi-select tag input)
- Minimum years of experience (number input)
- Seniority levels (multi-select)
- Languages/frameworks/tools (multi-select tag inputs)
- Databases (multi-select tag input)
- Cloud platforms (multi-select)
- DevOps tools (multi-select tag input)
- CI/CD tools (multi-select tag input)
- Testing frameworks (multi-select tag input)
- API experience (multi-select)
- Operating systems (multi-select)
- Company size range (multi-select)
- Industries (multi-select)
- Team size range (select brackets)
- Buying influence (multi-select)
- Paid tools (multi-select tag input)
- Open source activity (multi-select)

**Step 4 — Project Parameters & Payment:**
- Number of evaluations (number input, minimum 5)
- Preferred timeline (text)
- Price summary: [N] evaluations × $399 = $[total]
- "Proceed to Payment" button → redirects to Stripe Checkout

**After Stripe Checkout success:**
- Stripe webhook updates project status to `paid`
- Redirect back to project detail page
- Status shows "Paid — we're matching you with developers"

### 4.5 Company Project Detail (`/company/projects/[id]`)

**Project overview (top):**
- Product name, status badge, created date
- ICP criteria summary (collapsible)
- Evaluation progress: "3 of 5 evaluations complete"

**Evaluations section:**
- Only shows evaluations with status `approved` or `paid` (companies don't see in-progress evaluations)
- Or show all with status context — your call, but at minimum they should see how many are complete
- Each evaluation card shows: anonymous descriptor, status, completion date
- Click through to evaluation detail

**Findings report section:**
- Visible only when `report_published = true`
- Rendered markdown
- Copy button for the full report text
- (PDF export deferred to post-MVP)

### 4.6 Company Evaluation Detail (`/company/projects/[id]/evaluations/[id]`)
- Anonymous descriptor at top ("Senior Backend Engineer, 8 years experience, fintech, 200-person company")
- ClarityFlow recording embed/player
- Transcript section with prominent "Copy Transcript" button
- That's it — clean and focused on the deliverable

### 4.7 Stripe integration
- Create a Stripe account, get API keys
- `/api/stripe/checkout` — API route that creates a Stripe Checkout Session with the project total, metadata including project_id, and success/cancel URLs
- `/api/stripe/webhook` — receives Stripe webhook events. On `checkout.session.completed`: look up project by metadata, set status to `paid`, store stripe_checkout_session_id and stripe_payment_intent_id, set paid_at
- Use Stripe's test mode for development

### 4.8 Verify
- Company can sign up and create their company
- Company can create a project through the full wizard
- Stripe Checkout works in test mode and updates project status
- Project detail shows evaluation progress
- Company can view completed evaluations with recordings and transcripts
- Findings report renders when published
- Copy transcript button works

---

## Phase 5: ClarityFlow Integration
**Time estimate: 1-2 sessions**

### 5.1 Research ClarityFlow API
- Document the API endpoints available
- Determine how to: create a conversation, embed it, retrieve recording URLs, retrieve transcripts
- Test API calls manually before building

### 5.2 Conversation creation
- When a developer accepts an invitation, call ClarityFlow API to create a new conversation
- Store the conversation ID on the evaluation record
- Include evaluation instructions in the conversation (product name, what to evaluate, setup instructions)

### 5.3 Embed integration
- On developer evaluation detail page, embed the ClarityFlow conversation using their embed method (iframe or JS widget)
- Use the clarityflow_conversation_id to load the correct conversation

### 5.4 Recording retrieval
- After developer submits (you may need to poll or check manually for MVP)
- Pull recording embed URL from ClarityFlow and store on evaluation
- Pull transcript and store on evaluation

### 5.5 Verify
- Accepting an invitation creates a ClarityFlow conversation
- Developer can see and use the ClarityFlow embed
- After recording, embed URL and transcript are retrievable

**NOTE:** If ClarityFlow API access is limited or doesn't support all of this, the fallback for MVP is:
- You manually create ClarityFlow conversations and paste the conversation ID into the evaluation record via admin
- Developer accesses ClarityFlow via the embed
- You manually pull recording URLs and transcripts and paste them into the evaluation record via admin
- This is fine for launch. Automate when volume demands it.

---

## Phase 6: Email Notifications
**Time estimate: 1 session**

### 6.1 Choose a provider
Resend is the recommendation — generous free tier (3,000 emails/month), great DX, works perfectly with Next.js and Vercel.

### 6.2 Transactional emails to implement
Priority order:

1. **Developer invited** — "You've been invited to evaluate [product name]. Accept within 24 hours."
2. **Developer accepted confirmation** — "You've accepted! Here's what to do. Deadline: [date]."
3. **Developer recording deadline reminder** — 24 hours before deadline. "Don't forget to complete your evaluation."
4. **Developer payment confirmation** — "Payment of $[amount] has been sent to your PayPal."
5. **Company project paid confirmation** — "Your project is confirmed. We're matching developers now."
6. **Company evaluation ready** — "A new evaluation is ready for [project name]."
7. **Company report ready** — "Your findings report for [project name] is ready to view."

### 6.3 Implementation
- Create email templates (simple HTML, nothing fancy)
- Supabase Edge Functions or Next.js API routes to send via Resend
- Trigger from admin actions (status changes) for MVP — don't over-automate yet

### 6.4 Verify
- Emails send and arrive for each trigger
- Links in emails go to the correct pages
- Unsubscribe isn't needed for transactional emails but confirm with Resend's requirements

---

## Phase 7: Polish & Launch Prep
**Time estimate: 1-2 sessions**

### 7.1 Error handling
- Form validation on all inputs
- Graceful error states (API failures, missing data)
- Loading states on all async operations

### 7.2 Empty states
- Every list page needs an empty state message
- Developer evaluations: "No evaluations yet. Once your profile is complete, you'll receive invitations."
- Company projects: "Create your first evaluation project to get started."

### 7.3 Responsive design
- Test on mobile — developers and company contacts may check on phones
- Admin portal can be desktop-only for MVP

### 7.4 Security check
- Verify RLS policies work correctly (test as each role)
- Confirm companies cannot see developer identities anywhere
- Confirm developers cannot see project details they shouldn't
- Confirm anonymous_descriptor is the only developer info visible to companies

### 7.5 Seed data
- Import your existing developer network via the import tool
- Create a test company and project to verify the full flow end-to-end

### 7.6 Domain
- Point builtfor.dev to Vercel
- Configure SSL (Vercel handles this)
- Set up Supabase custom domain if desired

---

## What's NOT in the MVP (build later)

- Automated matching algorithm with scoring
- PayPal API payouts
- PDF report export
- ClarityFlow webhook automation
- Developer availability calendar
- Invitation batching / queuing
- Analytics dashboard for companies
- Multi-user company accounts (data model supports it, UI doesn't yet)
- AI-generated findings reports
- Developer Trends subscription product
