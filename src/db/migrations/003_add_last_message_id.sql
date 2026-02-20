-- Add last_message_id column to track which message was responded to
ALTER TABLE flow_sessions ADD COLUMN IF NOT EXISTS last_message_id VARCHAR(200);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_last_message ON flow_sessions(last_message_id);
