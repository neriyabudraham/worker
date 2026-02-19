const express = require('express');
const router = express.Router();
const { query } = require('../db');
const axios = require('axios');

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n2.neriyabudraham.co.il';

// Trigger n8n workflow by ID
router.post('/trigger/:workflowId', async (req, res, next) => {
    try {
        const { workflowId } = req.params;
        const payload = req.body;

        const response = await axios.post(
            `${N8N_BASE_URL}/webhook/${workflowId}`,
            payload,
            {
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
            }
        );

        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('n8n trigger error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Receive callback from n8n workflow (for outbound messages)
router.post('/callback/outbound', async (req, res, next) => {
    try {
        const { message_id, message, phone_bot, phone, status } = req.body;

        await query(
            `INSERT INTO livechat 
             (message_id, message, phone_bot, phone, direction, status)
             VALUES ($1, $2, $3, $4, 'outbound', $5)
             ON CONFLICT (message_id) DO UPDATE SET status = $5, updated_at = CURRENT_TIMESTAMP`,
            [message_id, message, phone_bot, phone, status || 'sent']
        );

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Sync bot config from n8n (for migration)
router.post('/sync/bot', async (req, res, next) => {
    try {
        const {
            phone_number,
            phone_number_id,
            name,
            workflow_id,
            n8n_webhook_url,
            status,
            access_mode,
            dynamic_sql_template,
            active_from,
            active_until,
            delay_seconds
        } = req.body;

        const result = await query(
            `INSERT INTO bots 
             (phone_number, phone_number_id, name, workflow_id, n8n_webhook_url, status, access_mode, dynamic_sql_template, active_from, active_until, delay_seconds)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (phone_number) DO UPDATE SET
                phone_number_id = EXCLUDED.phone_number_id,
                name = EXCLUDED.name,
                workflow_id = EXCLUDED.workflow_id,
                n8n_webhook_url = EXCLUDED.n8n_webhook_url,
                status = EXCLUDED.status,
                access_mode = EXCLUDED.access_mode,
                dynamic_sql_template = EXCLUDED.dynamic_sql_template,
                active_from = EXCLUDED.active_from,
                active_until = EXCLUDED.active_until,
                delay_seconds = EXCLUDED.delay_seconds
             RETURNING *`,
            [
                phone_number,
                phone_number_id,
                name,
                workflow_id,
                n8n_webhook_url,
                status || 'active',
                access_mode || 'everyone',
                dynamic_sql_template,
                active_from,
                active_until,
                delay_seconds || 0
            ]
        );

        res.json({ success: true, bot: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// Sync whitelist from n8n
router.post('/sync/whitelist', async (req, res, next) => {
    try {
        const { bot_id, phones } = req.body;

        if (!bot_id || !phones || !Array.isArray(phones)) {
            return res.status(400).json({ error: 'bot_id and phones array required' });
        }

        // Clear existing whitelist
        await query('DELETE FROM whitelisted_numbers WHERE bot_id = $1', [bot_id]);

        // Add new entries
        for (const phone of phones) {
            await query(
                `INSERT INTO whitelisted_numbers (bot_id, phone) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [bot_id, phone]
            );
        }

        res.json({ success: true, synced: phones.length });
    } catch (error) {
        next(error);
    }
});

// Sync blocked numbers from n8n
router.post('/sync/blocked', async (req, res, next) => {
    try {
        const { phones, reason } = req.body;

        if (!phones || !Array.isArray(phones)) {
            return res.status(400).json({ error: 'phones array required' });
        }

        for (const phone of phones) {
            await query(
                `INSERT INTO blocked_numbers (phone, reason) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [phone, reason || 'Synced from n8n']
            );
        }

        res.json({ success: true, synced: phones.length });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
