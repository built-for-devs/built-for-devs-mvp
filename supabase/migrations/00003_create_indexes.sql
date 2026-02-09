-- Migration: Create indexes for query performance

-- GIN indexes on developers text[] columns (for array containment/overlap queries)
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
