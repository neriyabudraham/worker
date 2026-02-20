-- Flow sessions table - tracks where users are in a flow
CREATE TABLE IF NOT EXISTS flow_sessions (
    id SERIAL PRIMARY KEY,
    flow_id INTEGER NOT NULL,
    phone VARCHAR(20) NOT NULL,
    current_node_id VARCHAR(100) NOT NULL,
    waiting_for VARCHAR(50), -- 'button', 'list', 'text', null
    waiting_options JSONB, -- stores button IDs or list item IDs for validation
    variables JSONB DEFAULT '{}',
    execution_id INTEGER,
    last_message_id VARCHAR(200), -- WhatsApp message ID that was responded to (to ignore duplicate clicks)
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE(flow_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_flow_sessions_phone ON flow_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_flow ON flow_sessions(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_status ON flow_sessions(status);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_last_message ON flow_sessions(last_message_id);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_flow_sessions_updated_at ON flow_sessions;
CREATE TRIGGER update_flow_sessions_updated_at
    BEFORE UPDATE ON flow_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
