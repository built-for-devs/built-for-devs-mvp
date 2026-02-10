import type { Tables, Enums } from "./database";

// Row type aliases
export type Developer = Tables<"developers">;
export type Profile = Tables<"profiles">;
export type Company = Tables<"companies">;
export type Project = Tables<"projects">;
export type Evaluation = Tables<"evaluations">;
export type CompanyContact = Tables<"company_contacts">;

// Joined types for list views
export type DeveloperWithProfile = Developer & {
  profiles: Pick<Profile, "full_name" | "email" | "avatar_url">;
};

export type ProjectWithCompany = Project & {
  companies: Pick<Company, "name" | "website">;
};

export type EvaluationWithRelations = Evaluation & {
  developers: {
    id: string;
    profile_id: string;
    paypal_email: string | null;
    profiles: Pick<Profile, "full_name" | "email">;
  };
  projects: {
    product_name: string;
    companies: Pick<Company, "name">;
  };
};

// Filter parameter types
export type DeveloperFilters = {
  search?: string;
  role_types?: string[];
  seniority?: string[];
  min_experience?: number;
  max_experience?: number;
  languages?: string[];
  frameworks?: string[];
  databases?: string[];
  cloud_platforms?: string[];
  devops_tools?: string[];
  cicd_tools?: string[];
  testing_frameworks?: string[];
  api_experience?: string[];
  operating_systems?: string[];
  industries?: string[];
  company_size?: string[];
  buying_influence?: string[];
  paid_tools?: string[];
  open_source_activity?: string[];
  is_available?: boolean;
  page?: number;
  per_page?: number;
};

export type ProjectFilters = {
  status?: Enums<"project_status">;
  search?: string;
  page?: number;
  per_page?: number;
};

export type EvaluationFilters = {
  status?: Enums<"evaluation_status">;
  search?: string;
  page?: number;
  per_page?: number;
};

export type ScoreFilters = {
  status?: string;
  search?: string;
  page?: number;
  per_page?: number;
};

// Dashboard stats
export type DashboardStats = {
  totalDevelopers: number;
  completedProfiles: number;
  totalCompanies: number;
  activeProjects: number;
  evaluationsNeedingReview: number;
  evaluationsNeedingPayment: number;
};
