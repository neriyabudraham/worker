const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { WhatsAppService, getWhatsAppServiceForBot } = require('../services/whatsapp');

// Verify WhatsApp credentials before adding a number
router.post('/verify', async (req, res, next) => {
    try {
        const { phone_number_id, access_token } = req.body;
        
        if (!phone_number_id || !access_token) {
            return res.status(400).json({ 
                success: false, 
                error: 'phone_number_id and access_token are required' 
            });
        }
        
        const wa = new WhatsAppService(phone_number_id, access_token);
        const result = await wa.verifyCredentials();
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Verification failed' 
        });
    }
});

// Add a new verified WhatsApp number
router.post('/numbers', async (req, res, next) => {
    try {
        const { 
            phone_number, 
            phone_number_id, 
            waba_id, 
            access_token, 
            name 
        } = req.body;
        
        if (!phone_number || !phone_number_id || !access_token) {
            return res.status(400).json({ 
                error: 'phone_number, phone_number_id and access_token are required' 
            });
        }
        
        // Verify credentials first
        const wa = new WhatsAppService(phone_number_id, access_token);
        const verification = await wa.verifyCredentials();
        
        if (!verification.success) {
            return res.status(400).json({ 
                error: 'Invalid credentials: ' + verification.error 
            });
        }
        
        // Check if number already exists
        const existing = await query(
            'SELECT id FROM bots WHERE phone_number = $1',
            [phone_number]
        );
        
        if (existing.rows.length > 0) {
            // Update existing
            const result = await query(
                `UPDATE bots 
                 SET phone_number_id = $1, waba_id = $2, access_token = $3, 
                     name = COALESCE($4, name), status = 'active'
                 WHERE phone_number = $5
                 RETURNING id, phone_number, phone_number_id, waba_id, name, status`,
                [phone_number_id, waba_id, access_token, name, phone_number]
            );
            return res.json({ 
                message: 'Number updated and verified',
                bot: result.rows[0],
                verified_name: verification.data.verified_name
            });
        }
        
        // Create new
        const result = await query(
            `INSERT INTO bots (phone_number, phone_number_id, waba_id, access_token, name, status)
             VALUES ($1, $2, $3, $4, $5, 'active')
             RETURNING id, phone_number, phone_number_id, waba_id, name, status`,
            [phone_number, phone_number_id, waba_id, access_token, name || verification.data.verified_name]
        );
        
        res.status(201).json({ 
            message: 'Number added and verified',
            bot: result.rows[0],
            verified_name: verification.data.verified_name
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Phone number already exists' });
        }
        next(error);
    }
});

// Get all WhatsApp numbers with their status
router.get('/numbers', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT id, phone_number, phone_number_id, waba_id, name, status, flow_id,
                   CASE WHEN access_token IS NOT NULL THEN true ELSE false END as has_token,
                   created_at
            FROM bots 
            WHERE phone_number_id IS NOT NULL
            ORDER BY created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// Send a message
router.post('/send', async (req, res, next) => {
    try {
        const { bot_id, to, message_type, content } = req.body;
        
        if (!bot_id || !to || !message_type) {
            return res.status(400).json({ 
                error: 'bot_id, to, and message_type are required' 
            });
        }
        
        const wa = await getWhatsAppServiceForBot(bot_id, { query });
        
        let result;
        switch (message_type) {
            case 'text':
                result = await wa.sendTextMessage(to, content.text);
                break;
            case 'buttons':
                result = await wa.sendButtonMessage(to, content.text, content.buttons);
                break;
            case 'image':
                result = await wa.sendImage(to, content.url, content.caption);
                break;
            case 'document':
                result = await wa.sendDocument(to, content.url, content.filename, content.caption);
                break;
            case 'template':
                result = await wa.sendTemplate(to, content.template_name, content.language, content.components);
                break;
            default:
                return res.status(400).json({ error: 'Invalid message_type' });
        }
        
        // Log the message
        await query(
            `INSERT INTO livechat (message_id, message, phone_bot, phone, direction, status)
             VALUES ($1, $2, (SELECT phone_number FROM bots WHERE id = $3), $4, 'outbound', 'sent')`,
            [result.messages?.[0]?.id, content.text || content.caption || message_type, bot_id, to]
        );
        
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to send message' 
        });
    }
});

// Send message by phone number (for flow executor)
router.post('/send-by-phone', async (req, res, next) => {
    try {
        const { from_phone, to, message_type, content } = req.body;
        
        if (!from_phone || !to || !message_type) {
            return res.status(400).json({ 
                error: 'from_phone, to, and message_type are required' 
            });
        }
        
        // Get bot credentials
        const botResult = await query(
            'SELECT id, phone_number_id, access_token FROM bots WHERE phone_number = $1',
            [from_phone]
        );
        
        if (botResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found for phone number' });
        }
        
        const bot = botResult.rows[0];
        if (!bot.phone_number_id || !bot.access_token) {
            return res.status(400).json({ error: 'Bot missing WhatsApp credentials' });
        }
        
        const wa = new WhatsAppService(bot.phone_number_id, bot.access_token);
        
        let result;
        switch (message_type) {
            case 'text':
                result = await wa.sendTextMessage(to, content.text);
                break;
            case 'buttons':
                result = await wa.sendButtonMessage(to, content.text, content.buttons);
                break;
            case 'image':
                result = await wa.sendImage(to, content.url, content.caption);
                break;
            case 'document':
                result = await wa.sendDocument(to, content.url, content.filename, content.caption);
                break;
            case 'template':
                result = await wa.sendTemplate(to, content.template_name, content.language, content.components);
                break;
            default:
                return res.status(400).json({ error: 'Invalid message_type' });
        }
        
        // Log the message
        await query(
            `INSERT INTO livechat (message_id, message, phone_bot, phone, direction, status)
             VALUES ($1, $2, $3, $4, 'outbound', 'sent')`,
            [result.messages?.[0]?.id, content.text || content.caption || message_type, from_phone, to]
        );
        
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to send message' 
        });
    }
});

// Test send a message (for verifying the setup works)
router.post('/test-send', async (req, res, next) => {
    try {
        const { bot_id, to } = req.body;
        
        if (!bot_id || !to) {
            return res.status(400).json({ error: 'bot_id and to are required' });
        }
        
        const wa = await getWhatsAppServiceForBot(bot_id, { query });
        const result = await wa.sendTextMessage(to, '✅ הודעת בדיקה מ-Worker Bot Builder');
        
        res.json({ success: true, message_id: result.messages?.[0]?.id });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to send test message' 
        });
    }
});

module.exports = router;
