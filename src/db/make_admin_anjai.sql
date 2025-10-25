-- Make anjai.cs23@stellamaryscoe.edu.in an administrator
-- Run this in Supabase SQL Editor

-- Update the auth.users table to set admin role in app_metadata
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"administrator"'
)
WHERE email = 'anjai.cs23@stellamaryscoe.edu.in';

-- Also update the student_profiles table
UPDATE student_profiles
SET role = 'administrator'
WHERE email = 'anjai.cs23@stellamaryscoe.edu.in';

-- Verify the changes
SELECT 
  id,
  email,
  raw_app_meta_data->>'role' as app_metadata_role,
  created_at
FROM auth.users
WHERE email = 'anjai.cs23@stellamaryscoe.edu.in';

SELECT 
  user_id,
  email,
  full_name,
  role
FROM student_profiles
WHERE email = 'anjai.cs23@stellamaryscoe.edu.in';
