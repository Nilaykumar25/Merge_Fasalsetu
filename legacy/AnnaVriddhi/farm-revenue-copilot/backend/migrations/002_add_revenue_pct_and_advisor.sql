-- Migration 002: Add Revenue Impact Percentage & AI Advisor
-- Features: A (Revenue Impact %) and B (AI Advisor)
-- Date: 2026-09-12

-- ══════════════════════════════════════════════════════════════════════
-- FEATURE A: Revenue Impact Percentage Tracking
-- ══════════════════════════════════════════════════════════════════════

-- Add revenue_impact_pct column to recommendation_events
ALTER TABLE recommendation_events 
ADD COLUMN IF NOT EXISTS revenue_impact_pct NUMERIC(5,2);

COMMENT ON COLUMN recommendation_events.revenue_impact_pct IS 
'Percentage impact on revenue vs. doing nothing. Calculated as ((projected - baseline) / baseline) * 100';

-- ══════════════════════════════════════════════════════════════════════
-- FEATURE B: AI Advisor Conversation History
-- ══════════════════════════════════════════════════════════════════════

-- Create advisor_conversations table
CREATE TABLE IF NOT EXISTS advisor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_advisor_conversations_farmer 
  ON advisor_conversations (farmer_id);

CREATE INDEX IF NOT EXISTS idx_advisor_conversations_created 
  ON advisor_conversations (created_at DESC);

COMMENT ON TABLE advisor_conversations IS 
'Stores AI advisor conversation history for analytics and context retrieval';

-- ══════════════════════════════════════════════════════════════════════
-- Verification queries
-- ══════════════════════════════════════════════════════════════════════

-- Check that revenue_impact_pct column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'recommendation_events' 
      AND column_name = 'revenue_impact_pct'
  ) THEN
    RAISE NOTICE 'SUCCESS: revenue_impact_pct column added to recommendation_events';
  ELSE
    RAISE WARNING 'FAILED: revenue_impact_pct column not found in recommendation_events';
  END IF;
END $$;

-- Check that advisor_conversations table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'advisor_conversations'
  ) THEN
    RAISE NOTICE 'SUCCESS: advisor_conversations table created';
  ELSE
    RAISE WARNING 'FAILED: advisor_conversations table not found';
  END IF;
END $$;
