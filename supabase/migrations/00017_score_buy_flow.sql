-- Add buy flow columns to scores table
ALTER TABLE scores ADD COLUMN buy_icp JSONB;
ALTER TABLE scores ADD COLUMN buy_num_evaluations INTEGER;
ALTER TABLE scores ADD COLUMN buy_project_id UUID REFERENCES projects(id);
