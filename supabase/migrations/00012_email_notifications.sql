-- Email notifications log
CREATE TABLE email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type text NOT NULL,
  related_evaluation_id uuid REFERENCES evaluations(id) ON DELETE SET NULL,
  related_project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent'
);

-- RLS
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- Admin can view all email logs
CREATE POLICY "Admins can view email notifications"
  ON email_notifications FOR SELECT
  USING (public.user_role() = 'admin');

-- Service role inserts (no RLS policy needed — service role bypasses RLS)
