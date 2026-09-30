-- Run this FIRST to fix the column type from UUID to TEXT
ALTER TABLE farmers DROP COLUMN IF EXISTS auth_user_id CASCADE;
