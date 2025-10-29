-- Create student_profiles table for Flex Academics participants
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Personal Information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  
  -- Academic Information
  student_id TEXT NOT NULL UNIQUE,
  year_of_study TEXT NOT NULL,
  section TEXT NOT NULL,
  branch TEXT NOT NULL,
  
  -- Role & Status
  role TEXT DEFAULT 'participant' CHECK (role IN ('participant', 'class_incharge', 'administrator')),
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Strike System
  total_strikes INTEGER DEFAULT 0 NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_submission_date DATE
);

-- Enable Row Level Security
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can insert their own profile (for registration)
CREATE POLICY "Users can insert own profile"
  ON public.student_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.student_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON public.student_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Administrators can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.student_profiles
  FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'administrator') OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'administrator')
  );

-- Create policy: Administrators can update any profile
CREATE POLICY "Admins can update any profile"
  ON public.student_profiles
  FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'administrator') OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'administrator')
  );

-- Create policy: Class in-charge can view profiles in their year/section
CREATE POLICY "Class in-charge can view their section"
  ON public.student_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_profiles my_profile
      WHERE my_profile.user_id = auth.uid()
      AND my_profile.role = 'class_incharge'
      AND student_profiles.year_of_study = my_profile.year_of_study
      AND student_profiles.section = my_profile.section
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON public.student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_student_id ON public.student_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_year_section ON public.student_profiles(year_of_study, section);
CREATE INDEX IF NOT EXISTS idx_student_profiles_role ON public.student_profiles(role);
CREATE INDEX IF NOT EXISTS idx_student_profiles_email ON public.student_profiles(email);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_profiles_updated_at
    BEFORE UPDATE ON public.student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for active participants
CREATE OR REPLACE VIEW public.active_participants AS
SELECT 
  id,
  user_id,
  full_name,
  email,
  phone_number,
  student_id,
  year_of_study,
  section,
  branch,
  role,
  total_strikes,
  last_submission_date,
  created_at
FROM public.student_profiles
WHERE is_active = true AND role = 'participant';

-- Comments for documentation
COMMENT ON TABLE public.student_profiles IS 'Stores profile information for Flex Academics participants';
COMMENT ON COLUMN public.student_profiles.user_id IS 'References auth.users - links to Supabase Auth';
COMMENT ON COLUMN public.student_profiles.phone_number IS 'WhatsApp number for notifications';
COMMENT ON COLUMN public.student_profiles.student_id IS 'Unique student ID from institution';
COMMENT ON COLUMN public.student_profiles.total_strikes IS 'Number of strikes for missing submissions';
COMMENT ON COLUMN public.student_profiles.role IS 'User role: participant, class_incharge, or administrator';
