-- Migration: Add WABA fields and flow_id to bots table
-- Run this on existing databases

-- Add new columns if they don't exist
DO $$ 
BEGIN
    -- Add waba_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bots' AND column_name = 'waba_id') THEN
        ALTER TABLE bots ADD COLUMN waba_id VARCHAR(50);
    END IF;
    
    -- Add access_token column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bots' AND column_name = 'access_token') THEN
        ALTER TABLE bots ADD COLUMN access_token TEXT;
    END IF;
    
    -- Add flow_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bots' AND column_name = 'flow_id') THEN
        ALTER TABLE bots ADD COLUMN flow_id INTEGER;
    END IF;
END $$;

-- Add index for flow_id
CREATE INDEX IF NOT EXISTS idx_bots_flow_id ON bots(flow_id);
