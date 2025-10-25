-- Create a table to store authorized Gmail addresses
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.authorized_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.authorized_emails ENABLE ROW LEVEL SECURITY;

-- Create policy: Anyone can read authorized emails (needed for auth verification)
CREATE POLICY "Anyone can read authorized emails"
  ON public.authorized_emails
  FOR SELECT
  USING (true);

-- Create policy: Only admins can insert authorized emails
-- Note: You'll need to set user role in user_metadata or app_metadata
CREATE POLICY "Admins can insert authorized emails"
  ON public.authorized_emails
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  );

-- Create policy: Only admins can update authorized emails
CREATE POLICY "Admins can update authorized emails"
  ON public.authorized_emails
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  );

-- Create policy: Only admins can delete authorized emails
CREATE POLICY "Admins can delete authorized emails"
  ON public.authorized_emails
  FOR DELETE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
  );

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_authorized_emails_email ON public.authorized_emails(email);
CREATE INDEX IF NOT EXISTS idx_authorized_emails_active ON public.authorized_emails(is_active) WHERE is_active = true;

-- Insert your first admin email (REPLACE WITH YOUR ACTUAL GMAIL)
-- This allows you to log in and manage other authorized emails
INSERT INTO public.authorized_emails (email, notes, is_active)
VALUES 
  ('your-admin@gmail.com', 'Initial admin user', true)
ON CONFLICT (email) DO NOTHING;

-- Optional: Create a view for active authorized emails only
CREATE OR REPLACE VIEW public.active_authorized_emails AS
SELECT email, added_at, notes
FROM public.authorized_emails
WHERE is_active = true;

COMMENT ON TABLE public.authorized_emails IS 'List of Gmail addresses authorized to access the platform';
COMMENT ON COLUMN public.authorized_emails.email IS 'Gmail address (must match Google OAuth email exactly)';
COMMENT ON COLUMN public.authorized_emails.is_active IS 'Whether this email is currently authorized (allows soft deletion)';
