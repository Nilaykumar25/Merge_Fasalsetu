-- Add auth_user_id column to farmers table for Firebase/Supabase Auth integration
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/qsbjnjxemnnvvfmvjxzs/sql

-- 1. Add the auth_user_id column
ALTER TABLE farmers 
ADD COLUMN IF NOT EXISTS auth_user_id TEXT UNIQUE;

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_farmers_auth_user_id ON farmers(auth_user_id);

-- 3. Update RLS policies to allow inserts with auth_user_id
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "farmers_select_own" ON farmers;
DROP POLICY IF EXISTS "farmers_insert_own" ON farmers;
DROP POLICY IF EXISTS "farmers_update_own" ON farmers;

-- Enable RLS
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;

-- Create new policies that work with both Supabase Auth and Firebase Auth
CREATE POLICY "farmers_select_own" ON farmers 
FOR SELECT 
USING (
  auth_user_id = auth.uid()::text 
  OR auth_user_id IS NULL  -- Allow reading for users without auth_user_id (legacy data)
);

CREATE POLICY "farmers_insert_own" ON farmers 
FOR INSERT 
WITH CHECK (
  auth_user_id = auth.uid()::text
  OR auth.uid() IS NOT NULL  -- Allow insert if authenticated (will be set by app)
);

CREATE POLICY "farmers_update_own" ON farmers 
FOR UPDATE 
USING (
  auth_user_id = auth.uid()::text
  OR auth_user_id IS NULL
);

-- 4. Make phone optional since we'll use email from Firebase
ALTER TABLE farmers 
ALTER COLUMN phone DROP NOT NULL;

-- 5. Update other fields to be optional for Firebase users
ALTER TABLE farmers
ALTER COLUMN state DROP NOT NULL;

COMMENT ON COLUMN farmers.auth_user_id IS 'Links to Firebase Auth UID or Supabase Auth user ID';
