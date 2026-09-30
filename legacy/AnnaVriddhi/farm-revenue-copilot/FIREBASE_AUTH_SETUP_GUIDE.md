# Firebase Authentication with Supabase Setup Guide

## Problem

The Google sign-in is working, but Supabase is rejecting the farmer profile creation with a 400 error. This is because:

1. The `farmers` table is missing the `auth_user_id` column
2. Row Level Security (RLS) policies are blocking unauthenticated inserts
3. Some required fields (phone, state) can't be null

## Solution

You need to run a SQL migration in your Supabase database to add the missing column and update the policies.

---

## Option 1: Full Setup with RLS (Recommended for Production)

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard/project/qsbjnjxemnnvvfmvjxzs
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Run the Migration

Copy and paste this SQL:

```sql
-- Add auth_user_id column to farmers table
ALTER TABLE farmers 
ADD COLUMN IF NOT EXISTS auth_user_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_farmers_auth_user_id ON farmers(auth_user_id);

-- Make phone and state optional for Firebase users
ALTER TABLE farmers 
ALTER COLUMN phone DROP NOT NULL,
ALTER COLUMN state DROP NOT NULL;

-- Update RLS policies
DROP POLICY IF EXISTS "farmers_select_own" ON farmers;
DROP POLICY IF EXISTS "farmers_insert_own" ON farmers;
DROP POLICY IF EXISTS "farmers_update_own" ON farmers;

ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own farmer profile
CREATE POLICY "farmers_select_own" ON farmers 
FOR SELECT 
USING (auth_user_id = auth.uid()::text OR auth_user_id IS NULL);

-- Allow authenticated users to insert their own profile
CREATE POLICY "farmers_insert_own" ON farmers 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own profile
CREATE POLICY "farmers_update_own" ON farmers 
FOR UPDATE 
USING (auth_user_id = auth.uid()::text OR auth_user_id IS NULL);
```

### Step 3: Click "Run" and verify

You should see "Success. No rows returned"

---

## Option 2: Quick Fix - Disable RLS (For Testing Only)

⚠️ **WARNING**: This removes all security from the farmers table. Only use for development!

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard/project/qsbjnjxemnnvvfmvjxzs
2. Click "SQL Editor"
3. Click "New Query"

### Step 2: Run this SQL

```sql
-- Add auth_user_id column
ALTER TABLE farmers 
ADD COLUMN IF NOT EXISTS auth_user_id TEXT UNIQUE;

-- Disable RLS temporarily (NOT SECURE!)
ALTER TABLE farmers DISABLE ROW LEVEL SECURITY;

-- Make fields optional
ALTER TABLE farmers 
ALTER COLUMN phone DROP NOT NULL,
ALTER COLUMN state DROP NOT NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_farmers_auth_user_id ON farmers(auth_user_id);
```

### Step 3: Test your app

Try signing in with Google again - it should work now!

### Step 4: Re-enable RLS before production

```sql
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
-- Then add proper policies from Option 1
```

---

## Option 3: Use the Full Supabase Migration (Best)

If you want the complete database structure with all proper RLS policies:

### Step 1: Run the migration file

1. Go to Supabase SQL Editor
2. Open the file: `backend/supabase/migrations/001_init_schema.sql`
3. Copy all the SQL content
4. Paste into Supabase SQL Editor
5. Click "Run"

This will create all tables with proper structure and security policies.

---

## Verify It Works

After running one of the above options:

1. **Refresh your browser** (Ctrl+F5)
2. Click **"Continue with Google"**
3. Sign in with your Google account
4. You should be redirected to the dashboard automatically

### Check the Console

Open browser DevTools (F12) and check the Console tab. You should see:

```
Google sign-in successful: your-email@gmail.com
Syncing Firebase user to Supabase: <firebase-uid>
Creating new farmer profile for Firebase user  (first time)
  OR
Existing farmer found: <farmer-id>  (subsequent logins)
New farmer created: <farmer-id>
Google sign-in complete, user synced
AppContent render: {isAuthenticated: true, ...}
User authenticated with farmer profile, navigating to dashboard
```

---

## Troubleshooting

### Still getting 400 errors?

1. **Check the Supabase logs**:
   - Go to Supabase Dashboard → Logs → API
   - Look for POST requests to `/farmers`
   - Check the error message

2. **Verify the column was added**:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'farmers';
```

3. **Check RLS status**:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'farmers';
```

### Anonymous key permissions

Your Supabase anon key has RLS enabled. Make sure the policies allow:
- `auth.uid()` to be set during Firebase sign-in
- Users to insert their own farmer profile

---

## What Each Option Does

| Option | Security | Setup Time | Recommended For |
|--------|----------|------------|-----------------|
| Option 1 | ✅ Secure | 2 minutes | Production |
| Option 2 | ❌ Insecure | 1 minute | Quick testing |
| Option 3 | ✅ Secure | 5 minutes | Full deployment |

Choose Option 1 for the best balance of security and speed.

---

## Need Help?

If you're still having issues after trying these options:

1. Check the browser console for specific error messages
2. Check Supabase Dashboard → Logs for server-side errors
3. Verify your Supabase project URL and anon key in `.env`

The SQL files are also saved in the `frontend/` directory:
- `ADD_AUTH_USER_ID_COLUMN.sql` (Option 1)
- `QUICK_FIX_DISABLE_RLS.sql` (Option 2)
