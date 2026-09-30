-- Run this first to see what currently exists in your Supabase database
-- Paste in SQL Editor → run → share the output

SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
