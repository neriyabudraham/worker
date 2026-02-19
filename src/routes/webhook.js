const express = require('express');
const router = express.Router();
const webhookProcessor = require('../services/webhookProcessor');

// WhatsApp webhook verification (GET)
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
        console.log('Webhook verified');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// WhatsApp webhook receiver (POST)
router.post('/', async (req, res) => {
    try {
        // Immediately respond to WhatsApp
        res.sendStatus(200);

        const payload = req.body;
        
        console.log('[ROUTE] Webhook received, object:', payload?.object);
        
        // Check if this is a message event
        if (payload?.object !== 'whatsapp_business_account') {
            console.log('[ROUTE] Not a WhatsApp business account event, skipping');
            return;
        }
        
        const messages = payload?.entry?.[0]?.changes?.[0]?.value?.messages;
        console.log('[ROUTE] Messages found:', messages?.length || 0);
        
        if (!messages || messages.length === 0) {
            console.log('[ROUTE] No messages in payload, skipping');
            return;
        }

        // Process the webhook
        const result = await webhookProcessor.processWhatsAppWebhook(payload);
        console.log('[ROUTE] Webhook result:', result.action, result.reason || '');

        // Trigger the workflow if approved
        if (result.action === 'approve') {
            console.log('[ROUTE] Triggering workflow...');
            webhookProcessor.triggerWorkflow(result, payload);
        }
    } catch (error) {
        console.error('[ROUTE] Webhook error:', error);
    }
});

// Generic webhook endpoint for other sources (e.g., WAHA)
router.post('/waha', async (req, res) => {
    try {
        res.sendStatus(200);
        
        // Transform WAHA format to standard format if needed
        const payload = req.body;
        
        const result = await webhookProcessor.processWhatsAppWebhook(payload);
        
        if (result.action === 'approve') {
            webhookProcessor.triggerWorkflow(result, payload);
        }
    } catch (error) {
        console.error('WAHA webhook error:', error);
    }
});

module.exports = router;
