-- Add INSERT policy for student_profiles table
-- This allows new users to create their own profile during registration
-- Run this in Supabase SQL Editor

-- Drop existing insert policies if any
DROP POLICY IF EXISTS "Users can insert own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.student_profiles;

-- Create policy: Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.student_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Alternative: If you want to use service_role key (bypass RLS), you can disable RLS temporarily
-- But keeping it enabled with proper policies is better for security

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'student_profiles';
