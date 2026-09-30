-- Fix crop_cycles table to use crop_id instead of id
-- Run this in Supabase SQL Editor

-- Check current column name
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'crop_cycles' 
AND column_name IN ('id', 'crop_id');

-- If the column is named 'id', rename it to 'crop_id'
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'crop_cycles' 
        AND column_name = 'id'
    ) THEN
        ALTER TABLE crop_cycles RENAME COLUMN id TO crop_id;
        RAISE NOTICE 'Renamed id to crop_id';
    ELSE
        RAISE NOTICE 'Column already named crop_id';
    END IF;
END $$;

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'crop_cycles' 
AND column_name = 'crop_id';
