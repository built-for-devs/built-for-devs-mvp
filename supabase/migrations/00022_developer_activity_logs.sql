-- Activity log for tracking changes to developer records
CREATE TABLE developer_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dev_activity_developer ON developer_activity_logs(developer_id, created_at DESC);

ALTER TABLE developer_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_activity" ON developer_activity_logs
  FOR SELECT USING (public.user_role() = 'admin');

CREATE POLICY "admin_insert_activity" ON developer_activity_logs
  FOR INSERT WITH CHECK (public.user_role() = 'admin');
