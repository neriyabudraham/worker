-- Track which buttons have been clicked (each button can only be clicked once)
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

CREATE INDEX IF NOT EXISTS idx_button_clicks_lookup ON flow_button_clicks(flow_id, phone, message_id);
