-- Bot Builder Schema
-- Tables for visual bot flow builder

-- Flows (תהליכים)
CREATE TABLE IF NOT EXISTS flows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'raffle', -- raffle, support, marketing, etc.
    bot_id INTEGER REFERENCES bots(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT false,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Flow Nodes (צמתים בתהליך)
CREATE TABLE IF NOT EXISTS flow_nodes (
    id SERIAL PRIMARY KEY,
    flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
    node_id VARCHAR(100) NOT NULL, -- ReactFlow node ID
    type VARCHAR(50) NOT NULL, -- trigger, filter, action, database, logic
    subtype VARCHAR(50) NOT NULL, -- message_received, switch, send_text, sql_query, etc.
    label VARCHAR(255),
    position_x FLOAT DEFAULT 0,
    position_y FLOAT DEFAULT 0,
    config JSONB DEFAULT '{}', -- Node-specific configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(flow_id, node_id)
);

-- Flow Edges (חיבורים בין צמתים)
CREATE TABLE IF NOT EXISTS flow_edges (
    id SERIAL PRIMARY KEY,
    flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
    edge_id VARCHAR(100) NOT NULL,
    source_node_id VARCHAR(100) NOT NULL,
    source_handle VARCHAR(50), -- For nodes with multiple outputs
    target_node_id VARCHAR(100) NOT NULL,
    target_handle VARCHAR(50),
    label VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(flow_id, edge_id)
);

-- Flow Variables (משתנים לתהליך)
CREATE TABLE IF NOT EXISTS flow_variables (
    id SERIAL PRIMARY KEY,
    flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    default_value TEXT,
    description TEXT,
    var_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(flow_id, name)
);

-- Flow Executions (הרצות של תהליכים)
CREATE TABLE IF NOT EXISTS flow_executions (
    id SERIAL PRIMARY KEY,
    flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
    phone VARCHAR(20), -- Phone number that triggered the flow
    trigger_data JSONB, -- Original webhook data
    current_node_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'running', -- running, completed, failed, waiting
    variables JSONB DEFAULT '{}', -- Runtime variables
    execution_log JSONB DEFAULT '[]', -- Log of executed nodes
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
);

-- Raffle Participants (משתתפי הגרלה - טבלה כללית)
CREATE TABLE IF NOT EXISTS raffle_participants (
    id SERIAL PRIMARY KEY,
    flow_id INTEGER REFERENCES flows(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    full_name VARCHAR(255),
    status VARCHAR(100) DEFAULT 'registered',
    came_from VARCHAR(20), -- מספר המפנה
    cards INTEGER DEFAULT 0, -- כמות כרטיסים
    share_count INTEGER DEFAULT 0, -- כמות שיתופים
    extra_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(flow_id, phone)
);

-- Flow Sessions (מעקב אחר מיקום המשתמש בתהליך)
CREATE TABLE IF NOT EXISTS flow_sessions (
    id SERIAL PRIMARY KEY,
    flow_id INTEGER NOT NULL,
    phone VARCHAR(20) NOT NULL,
    current_node_id VARCHAR(100) NOT NULL,
    waiting_for VARCHAR(50), -- 'button', 'list', 'text', null
    waiting_options JSONB,
    variables JSONB DEFAULT '{}',
    execution_id INTEGER,
    last_message_id VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE(flow_id, phone)
);

-- Flow Button Clicks (מעקב אחר לחיצות על כפתורים - כפתור ניתן ללחוץ פעם אחת)
CREATE TABLE IF NOT EXISTS flow_button_clicks (
    id SERIAL PRIMARY KEY,
    flow_id INTEGER NOT NULL,
    phone VARCHAR(20) NOT NULL,
    message_id VARCHAR(200) NOT NULL, -- WhatsApp message ID
    button_id VARCHAR(50) NOT NULL, -- btn_0, btn_1, etc.
    button_title VARCHAR(100),
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(flow_id, phone, message_id, button_id)
);

-- Flow Sent Messages (מיפוי הודעות שנשלחו לצמתים - לזיהוי תגובות)
CREATE TABLE IF NOT EXISTS flow_sent_messages (
    id SERIAL PRIMARY KEY,
    flow_id INTEGER NOT NULL,
    phone VARCHAR(20) NOT NULL,
    node_id VARCHAR(100) NOT NULL,
    message_id VARCHAR(200) NOT NULL, -- WhatsApp message ID (wamid.xxx)
    node_type VARCHAR(50), -- 'message', 'list', etc.
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_flow_nodes_flow_id ON flow_nodes(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_edges_flow_id ON flow_edges(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_flow_id ON flow_executions(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_executions_phone ON flow_executions(phone);
CREATE INDEX IF NOT EXISTS idx_raffle_participants_flow_phone ON raffle_participants(flow_id, phone);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_phone ON flow_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_flow ON flow_sessions(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_status ON flow_sessions(status);
CREATE INDEX IF NOT EXISTS idx_button_clicks_lookup ON flow_button_clicks(flow_id, phone, message_id);
CREATE INDEX IF NOT EXISTS idx_sent_messages_lookup ON flow_sent_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_sent_messages_flow_phone ON flow_sent_messages(flow_id, phone);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_flow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_flows_timestamp ON flows;
CREATE TRIGGER update_flows_timestamp
    BEFORE UPDATE ON flows
    FOR EACH ROW
    EXECUTE FUNCTION update_flow_timestamp();

DROP TRIGGER IF EXISTS update_raffle_participants_timestamp ON raffle_participants;
CREATE TRIGGER update_raffle_participants_timestamp
    BEFORE UPDATE ON raffle_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_flow_timestamp();

DROP TRIGGER IF EXISTS update_flow_sessions_timestamp ON flow_sessions;
CREATE TRIGGER update_flow_sessions_timestamp
    BEFORE UPDATE ON flow_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_flow_timestamp();
