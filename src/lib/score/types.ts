// --- Evaluation output types (matches Claude's JSON output) ---

export interface CategoryScore {
  score: number;
  max: number;
  evidence: string[];
  feedback: string;
}

export interface RedFlag {
  flag: string;
  deduction: number;
  developer_thinking: string;
}

export interface CriticalIssue {
  issue: string;
  impact: string;
  developer_behavior: string;
}

export interface QuickWin {
  recommendation: string;
  impact: string;
  effort: "low" | "medium";
}

export interface StrategicOpportunity {
  area: string;
  current_gap: string;
  developer_impact: string;
  solution_approach: string;
}

export type Classification =
  | "exceptional"
  | "excellent"
  | "good"
  | "needs_work"
  | "poor";

export interface EvaluationSummary {
  base_score: number;
  total_deductions: number;
  final_score: number;
  classification: Classification;
  one_line_verdict: string;
}

export interface ScoreCategories {
  developer_recognition_signals: CategoryScore;
  value_proposition_clarity: CategoryScore;
  technical_credibility: CategoryScore;
  trust_social_proof: CategoryScore;
  integration_context: CategoryScore;
  documentation_quality: CategoryScore;
  technical_depth: CategoryScore;
  trial_accessibility: CategoryScore;
  developer_tooling: CategoryScore;
  developer_support_quality: CategoryScore;
  learning_resources: CategoryScore;
  product_cohesion: CategoryScore;
}

export interface ScoreEvaluation {
  product_name: string;
  target_url: string;
  score_date: string;
  scores: ScoreCategories;
  red_flags: RedFlag[];
  critical_issues: CriticalIssue[];
  summary: EvaluationSummary;
  quick_wins: QuickWin[];
  strategic_opportunities: StrategicOpportunity[];
  what_ai_cant_tell_you: string[];
}

// --- Crawl types ---

export interface CrawledPage {
  url: string;
  label: string;
  content: string;
  status: "success" | "failed" | "skipped";
  error?: string;
}

export interface CrawlResult {
  pages: CrawledPage[];
  totalTokensEstimate: number;
}

// --- Score status ---

export type ScoreStatus =
  | "pending"
  | "crawling"
  | "evaluating"
  | "complete"
  | "failed";

// --- Category metadata for display ---

export const CATEGORY_META: Record<
  keyof ScoreCategories,
  { label: string; description: string }
> = {
  developer_recognition_signals: {
    label: "Developer Recognition Signals",
    description:
      "Does the site speak directly to developers from the first interaction?",
  },
  value_proposition_clarity: {
    label: "Value Proposition Clarity",
    description:
      "Can a developer understand what this does and why they should care within 30 seconds?",
  },
  technical_credibility: {
    label: "Technical Credibility",
    description: "Does the product demonstrate genuine technical depth?",
  },
  trust_social_proof: {
    label: "Trust & Social Proof",
    description:
      "Are there credible signals that other developers trust this product?",
  },
  integration_context: {
    label: "Integration Context",
    description:
      "Can developers see how this fits into their existing workflow?",
  },
  documentation_quality: {
    label: "Documentation Quality",
    description:
      "Is the documentation developer-friendly, searchable, and up-to-date?",
  },
  technical_depth: {
    label: "Technical Depth",
    description:
      "Does the product show enough technical detail to build confidence?",
  },
  trial_accessibility: {
    label: "Trial Accessibility",
    description:
      "How easy is it for a developer to start using the product right now?",
  },
  developer_tooling: {
    label: "Developer Tooling",
    description:
      "Are SDKs, CLIs, and integrations available in the developer's preferred ecosystem?",
  },
  developer_support_quality: {
    label: "Developer Support Quality",
    description: "Can developers get help quickly when they get stuck?",
  },
  learning_resources: {
    label: "Learning Resources",
    description:
      "Are there tutorials, guides, and examples that help developers learn the product?",
  },
  product_cohesion: {
    label: "Product Cohesion",
    description:
      "Does the overall experience feel consistent and well-considered?",
  },
};
