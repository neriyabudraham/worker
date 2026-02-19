const https = require('https');

const WHATSAPP_API_BASE = 'graph.facebook.com';
const API_VERSION = 'v18.0';

class WhatsAppService {
    constructor(phoneNumberId, accessToken) {
        this.phoneNumberId = phoneNumberId;
        this.accessToken = accessToken;
    }

    async makeRequest(method, endpoint, body = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: WHATSAPP_API_BASE,
                port: 443,
                path: `/${API_VERSION}/${endpoint}`,
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(json);
                        } else {
                            reject({ status: res.statusCode, error: json.error || json });
                        }
                    } catch (e) {
                        reject({ status: res.statusCode, error: data });
                    }
                });
            });

            req.on('error', reject);
            
            if (body) {
                req.write(JSON.stringify(body));
            }
            req.end();
        });
    }

    async verifyCredentials() {
        try {
            const result = await this.makeRequest('GET', `${this.phoneNumberId}?fields=verified_name,display_phone_number`);
            return {
                success: true,
                data: {
                    verified_name: result.verified_name,
                    display_phone_number: result.display_phone_number,
                    phone_number_id: result.id
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.error?.message || error.error || 'Verification failed'
            };
        }
    }

    async sendTextMessage(to, text) {
        const body = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'text',
            text: { body: text }
        };

        return this.makeRequest('POST', `${this.phoneNumberId}/messages`, body);
    }

    async sendButtonMessage(to, text, buttons) {
        const body = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'interactive',
            interactive: {
                type: 'button',
                body: { text: text },
                action: {
                    buttons: buttons.slice(0, 3).map((btn, index) => ({
                        type: 'reply',
                        reply: {
                            id: `btn_${index}`,
                            title: btn.substring(0, 20)
                        }
                    }))
                }
            }
        };

        return this.makeRequest('POST', `${this.phoneNumberId}/messages`, body);
    }

    async sendListMessage(to, text, buttonText, sections) {
        const body = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'interactive',
            interactive: {
                type: 'list',
                body: { text: text },
                action: {
                    button: buttonText,
                    sections: sections
                }
            }
        };

        return this.makeRequest('POST', `${this.phoneNumberId}/messages`, body);
    }

    async sendImage(to, imageUrl, caption = '') {
        const body = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'image',
            image: {
                link: imageUrl,
                caption: caption
            }
        };

        return this.makeRequest('POST', `${this.phoneNumberId}/messages`, body);
    }

    async sendDocument(to, documentUrl, filename, caption = '') {
        const body = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'document',
            document: {
                link: documentUrl,
                filename: filename,
                caption: caption
            }
        };

        return this.makeRequest('POST', `${this.phoneNumberId}/messages`, body);
    }

    async sendTemplate(to, templateName, languageCode = 'he', components = []) {
        const body = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode },
                components: components
            }
        };

        return this.makeRequest('POST', `${this.phoneNumberId}/messages`, body);
    }

    async markAsRead(messageId) {
        const body = {
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId
        };

        return this.makeRequest('POST', `${this.phoneNumberId}/messages`, body);
    }
}

async function getWhatsAppServiceForBot(botId, db) {
    const result = await db.query(
        'SELECT phone_number_id, access_token FROM bots WHERE id = $1',
        [botId]
    );
    
    if (result.rows.length === 0) {
        throw new Error('Bot not found');
    }
    
    const bot = result.rows[0];
    if (!bot.phone_number_id || !bot.access_token) {
        throw new Error('Bot missing WhatsApp credentials');
    }
    
    return new WhatsAppService(bot.phone_number_id, bot.access_token);
}

async function getWhatsAppServiceForPhone(phoneNumber, db) {
    const result = await db.query(
        'SELECT phone_number_id, access_token FROM bots WHERE phone_number = $1',
        [phoneNumber]
    );
    
    if (result.rows.length === 0) {
        throw new Error('Bot not found for phone number');
    }
    
    const bot = result.rows[0];
    if (!bot.phone_number_id || !bot.access_token) {
        throw new Error('Bot missing WhatsApp credentials');
    }
    
    return new WhatsAppService(bot.phone_number_id, bot.access_token);
}

module.exports = {
    WhatsAppService,
    getWhatsAppServiceForBot,
    getWhatsAppServiceForPhone
};
