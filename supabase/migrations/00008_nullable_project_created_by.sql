-- Allow admin-created projects without a company contact
ALTER TABLE public.projects ALTER COLUMN created_by DROP NOT NULL;
