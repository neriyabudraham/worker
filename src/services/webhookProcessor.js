const { query } = require('../db');
const axios = require('axios');

const MASTER_PHONE = process.env.MASTER_PHONE || '972584254229';

class WebhookProcessor {
    async processWhatsAppWebhook(payload) {
        try {
            const messageData = this.extractMessageData(payload);
            if (!messageData) {
                return { action: 'skip', reason: 'no_message_data' };
            }

            // Log the incoming message
            await this.logMessage(messageData);

            // Get bot configuration
            const bot = await this.getBotConfig(messageData.phoneBot);
            if (!bot) {
                return { action: 'stop', reason: 'no_bot' };
            }

            // Check if sender is globally blocked
            const isBlocked = await this.isPhoneBlocked(messageData.phone);
            if (isBlocked) {
                return { action: 'stop', reason: 'blocked' };
            }

            // Validate bot timing and status
            const validationResult = this.validateBot(bot);
            if (validationResult.action === 'stop') {
                return validationResult;
            }

            // Master phone bypass (after validation)
            if (messageData.phone === MASTER_PHONE) {
                return this.buildApprovalResponse(bot, messageData);
            }

            // Check access permissions
            const accessResult = await this.checkAccess(bot, messageData.phone);
            if (accessResult.action === 'stop') {
                return accessResult;
            }

            return this.buildApprovalResponse(bot, messageData);
        } catch (error) {
            console.error('Webhook processing error:', error);
            throw error;
        }
    }

    extractMessageData(payload) {
        try {
            const entry = payload?.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;
            
            if (!value?.messages?.[0]) return null;

            const message = value.messages[0];
            const contact = value.contacts?.[0];
            const metadata = value.metadata;

            return {
                messageId: message.id,
                message: this.extractMessageText(message),
                media: message.image?.id || message.video?.id || message.audio?.id || message.document?.id || null,
                mimeType: this.getMimeType(message),
                phoneBot: metadata?.display_phone_number,
                phoneBotId: metadata?.phone_number_id,
                phone: contact?.wa_id || message.from,
                contactName: contact?.profile?.name,
                timestamp: message.timestamp,
                type: message.type
            };
        } catch (error) {
            console.error('Error extracting message data:', error);
            return null;
        }
    }

    extractMessageText(message) {
        const sources = [
            message.interactive?.list_reply?.title,
            message.interactive?.button_reply?.title,
            message.text?.body,
            message.image?.caption,
            message.video?.caption,
            message.reaction?.emoji
        ];
        return sources.filter(Boolean).join(' ').replace(/'/g, '׳') || '';
    }

    getMimeType(message) {
        const type = message.type || '';
        const interactiveType = message.interactive?.type || '';
        return interactiveType ? type.replace('interactive', interactiveType) : type;
    }

    async getBotConfig(phoneBot) {
        const result = await query(
            `SELECT * FROM bots WHERE phone_number = $1 LIMIT 1`,
            [phoneBot]
        );
        return result.rows[0] || null;
    }

    async isPhoneBlocked(phone) {
        const result = await query(
            `SELECT 1 FROM blocked_numbers WHERE phone = $1 LIMIT 1`,
            [phone]
        );
        return result.rows.length > 0;
    }

    validateBot(bot) {
        const now = new Date();
        const israelTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));

        if (bot.status === 'inactive') {
            return { action: 'stop', reason: 'bot_off' };
        }

        if (bot.active_from && israelTime < new Date(bot.active_from)) {
            return { action: 'stop', reason: 'too_early' };
        }

        if (bot.active_until && israelTime > new Date(bot.active_until)) {
            return { action: 'stop', reason: 'expired' };
        }

        return { action: 'continue' };
    }

    async checkAccess(bot, phone) {
        switch (bot.access_mode) {
            case 'everyone':
                return { action: 'approve' };
            
            case 'whitelist':
                const isWhitelisted = await this.isPhoneWhitelisted(bot.id, phone);
                if (!isWhitelisted) {
                    return { action: 'stop', reason: 'not_in_whitelist' };
                }
                return { action: 'approve' };
            
            case 'dynamic':
                if (!bot.dynamic_sql_template) {
                    return { action: 'stop', reason: 'missing_dynamic_query' };
                }
                const isDynamicAllowed = await this.checkDynamicAccess(bot.dynamic_sql_template, phone);
                if (!isDynamicAllowed) {
                    return { action: 'stop', reason: 'dynamic_check_failed' };
                }
                return { action: 'approve' };
            
            default:
                return { action: 'stop', reason: 'unknown_mode' };
        }
    }

    async isPhoneWhitelisted(botId, phone) {
        const result = await query(
            `SELECT 1 FROM whitelisted_numbers WHERE bot_id = $1 AND phone = $2 LIMIT 1`,
            [botId, phone]
        );
        return result.rows.length > 0;
    }

    async checkDynamicAccess(template, phone) {
        try {
            const phoneShort = phone.slice(-9);
            const finalQuery = template.replace(/{{phone}}/g, phoneShort);
            const result = await query(finalQuery);
            return result.rows.length > 0;
        } catch (error) {
            console.error('Dynamic query error:', error);
            return false;
        }
    }

    buildApprovalResponse(bot, messageData) {
        return {
            action: 'approve',
            workflowId: bot.workflow_id,
            webhookUrl: bot.n8n_webhook_url,
            delay: bot.delay_seconds || 0,
            messageData,
            botId: bot.id
        };
    }

    async logMessage(data) {
        try {
            await query(
                `INSERT INTO livechat 
                 (message_id, message, media, mime_type, phone_bot, phone, phone_bot_id, direction, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (message_id) DO NOTHING`,
                [
                    data.messageId,
                    data.message,
                    data.media,
                    data.mimeType,
                    data.phoneBot,
                    data.phone,
                    data.phoneBotId,
                    'inbound',
                    'received'
                ]
            );
        } catch (error) {
            console.error('Error logging message:', error);
        }
    }

    async triggerWorkflow(result, originalPayload) {
        if (result.action !== 'approve') return;

        // Apply delay if configured
        if (result.delay > 0) {
            await this.sleep(result.delay * 1000);
        }

        // Update message as processed
        if (result.messageData?.messageId) {
            await query(
                `UPDATE livechat SET processed = true, workflow_triggered = $1 WHERE message_id = $2`,
                [result.workflowId || result.webhookUrl, result.messageData.messageId]
            );
        }

        // Trigger n8n workflow via webhook
        if (result.webhookUrl) {
            try {
                await axios.post(result.webhookUrl, originalPayload, {
                    timeout: 30000,
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                console.error('n8n webhook trigger failed:', error.message);
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new WebhookProcessor();
