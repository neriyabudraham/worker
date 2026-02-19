-- Bot Router Database Schema

-- Bots table
CREATE TABLE IF NOT EXISTS bots (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    phone_number_id VARCHAR(50),
    waba_id VARCHAR(50), -- WhatsApp Business Account ID
    access_token TEXT, -- WhatsApp API Access Token
    name VARCHAR(100),
    workflow_id VARCHAR(100),
    workflow_name VARCHAR(255),
    n8n_webhook_url TEXT,
    flow_id INTEGER, -- Reference to builder flow
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    access_mode VARCHAR(30) DEFAULT 'everyone' CHECK (access_mode IN ('everyone', 'whitelist', 'dynamic')),
    dynamic_sql_template TEXT,
    active_from TIMESTAMP,
    active_until TIMESTAMP,
    delay_seconds INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Globally blocked numbers
CREATE TABLE IF NOT EXISTS blocked_numbers (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    reason TEXT,
    blocked_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Per-bot whitelisted numbers
CREATE TABLE IF NOT EXISTS whitelisted_numbers (
    id SERIAL PRIMARY KEY,
    bot_id INTEGER REFERENCES bots(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    added_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(bot_id, phone)
);

-- Message logs (livechat)
CREATE TABLE IF NOT EXISTS livechat (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(100) UNIQUE,
    message TEXT,
    media VARCHAR(255),
    mime_type VARCHAR(50),
    phone_bot VARCHAR(20),
    phone VARCHAR(20),
    phone_bot_id VARCHAR(50),
    direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
    status VARCHAR(20),
    processed BOOLEAN DEFAULT FALSE,
    workflow_triggered VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bots_phone ON bots(phone_number);
CREATE INDEX IF NOT EXISTS idx_blocked_phone ON blocked_numbers(phone);
CREATE INDEX IF NOT EXISTS idx_whitelist_bot_phone ON whitelisted_numbers(bot_id, phone);
CREATE INDEX IF NOT EXISTS idx_livechat_phone ON livechat(phone);
CREATE INDEX IF NOT EXISTS idx_livechat_phone_bot ON livechat(phone_bot);
CREATE INDEX IF NOT EXISTS idx_livechat_created ON livechat(created_at);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_bots_updated_at ON bots;
CREATE TRIGGER update_bots_updated_at
    BEFORE UPDATE ON bots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_livechat_updated_at ON livechat;
CREATE TRIGGER update_livechat_updated_at
    BEFORE UPDATE ON livechat
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
