-- Track which node sent which WhatsApp message
-- This allows us to find the correct node when receiving interactive replies
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

CREATE INDEX IF NOT EXISTS idx_sent_messages_lookup ON flow_sent_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_sent_messages_flow_phone ON flow_sent_messages(flow_id, phone);
