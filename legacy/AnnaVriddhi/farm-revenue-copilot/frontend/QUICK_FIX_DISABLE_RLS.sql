-- QUICK FIX: Disable RLS on farmers table temporarily
-- Run this in your Supabase SQL Editor if you want to test quickly
-- WARNING: This removes security - only use for development/testing!

-- 1. Add the auth_user_id column
ALTER TABLE farmers 
ADD COLUMN IF NOT EXISTS auth_user_id TEXT UNIQUE;

-- 2. Disable RLS temporarily (NOT RECOMMENDED FOR PRODUCTION)
ALTER TABLE farmers DISABLE ROW LEVEL SECURITY;

-- 3. Make fields optional for Firebase users
ALTER TABLE farmers 
ALTER COLUMN phone DROP NOT NULL,
ALTER COLUMN state DROP NOT NULL;

-- 4. Create index
CREATE INDEX IF NOT EXISTS idx_farmers_auth_user_id ON farmers(auth_user_id);

-- NOTE: Re-enable RLS before deploying to production!
-- To re-enable: ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
