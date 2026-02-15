export interface IcpCriteria {
  role_types: string[];
  seniority: string[];
  languages: string[];
  frameworks: string[];
  databases: string[];
  cloud_platforms: string[];
  devops_tools: string[];
  cicd_tools: string[];
  testing_frameworks: string[];
  api_experience: string[];
  operating_systems: string[];
  industries: string[];
  company_size: string[];
  buying_influence: string[];
  paid_tools: string[];
  open_source_activity: string[];
}

export const EMPTY_ICP_CRITERIA: IcpCriteria = {
  role_types: [],
  seniority: [],
  languages: [],
  frameworks: [],
  databases: [],
  cloud_platforms: [],
  devops_tools: [],
  cicd_tools: [],
  testing_frameworks: [],
  api_experience: [],
  operating_systems: [],
  industries: [],
  company_size: [],
  buying_influence: [],
  paid_tools: [],
  open_source_activity: [],
};

export const ICP_CRITERIA_KEYS = Object.keys(
  EMPTY_ICP_CRITERIA
) as (keyof IcpCriteria)[];

export interface IcpSuggestResponse {
  criteria: IcpCriteria;
  reasoning: Record<string, string>;
  overallReasoning: string;
}
