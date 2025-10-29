-- Add strikes and status columns to student_profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE student_profiles
ADD COLUMN IF NOT EXISTS strikes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_student_profiles_status ON student_profiles(status);
CREATE INDEX IF NOT EXISTS idx_student_profiles_strikes ON student_profiles(strikes);

-- Verify the changes
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'student_profiles'
AND column_name IN ('strikes', 'status');
