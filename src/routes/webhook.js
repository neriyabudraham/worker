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
        // Immediately respond
        res.sendStatus(200);

        let payload = req.body;
        
        // Unwrap if payload is nested in 'body' (from n8n forwarding)
        if (payload?.body && typeof payload.body === 'object') {
            console.log('[WEBHOOK] Unwrapping nested body...');
            payload = payload.body;
        }
        
        console.log('\n========== WEBHOOK RECEIVED ==========');
        console.log('From:', payload?.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.wa_id);
        console.log('To Bot:', payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.display_phone_number);
        console.log('Message:', payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body?.substring(0, 100));
        
        // Detect format: Official WhatsApp or WAHA
        let normalizedPayload = payload;
        let format = 'unknown';
        
        if (payload?.object === 'whatsapp_business_account') {
            format = 'official';
            const messages = payload?.entry?.[0]?.changes?.[0]?.value?.messages;
            if (!messages || messages.length === 0) {
                console.log('[WEBHOOK] Official format but no messages, skipping');
                return;
            }
        } else if (payload?.event || payload?.payload) {
            // WAHA format
            format = 'waha';
            normalizedPayload = webhookProcessor.normalizeWahaPayload(payload);
        } else {
            console.log('[WEBHOOK] Unknown format, raw:', JSON.stringify(payload).substring(0, 300));
        }
        
        console.log('[WEBHOOK] Format:', format);

        // Process the webhook
        const result = await webhookProcessor.processWhatsAppWebhook(normalizedPayload);
        console.log('[WEBHOOK] Result:', result.action, '|', result.reason || 'OK');

        // Trigger the workflow if approved
        if (result.action === 'approve') {
            console.log('[WEBHOOK] Triggering:', result.webhookUrl || result.workflowId);
            webhookProcessor.triggerWorkflow(result, payload);
        }
        
        console.log('=======================================\n');
    } catch (error) {
        console.error('[WEBHOOK] Error:', error.message);
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
