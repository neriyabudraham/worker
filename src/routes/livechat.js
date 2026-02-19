const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Get messages with pagination
router.get('/', async (req, res, next) => {
    try {
        const { limit = 50, offset = 0, phone, phone_bot, direction } = req.query;
        
        let sql = 'SELECT * FROM livechat WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (phone) {
            sql += ` AND phone = $${paramIndex}`;
            params.push(phone);
            paramIndex++;
        }

        if (phone_bot) {
            sql += ` AND phone_bot = $${paramIndex}`;
            params.push(phone_bot);
            paramIndex++;
        }

        if (direction) {
            sql += ` AND direction = $${paramIndex}`;
            params.push(direction);
            paramIndex++;
        }

        sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// Get conversation between bot and phone
router.get('/conversation/:phoneBot/:phone', async (req, res, next) => {
    try {
        const { limit = 100 } = req.query;
        const result = await query(
            `SELECT * FROM livechat 
             WHERE phone_bot = $1 AND phone = $2 
             ORDER BY created_at DESC 
             LIMIT $3`,
            [req.params.phoneBot, req.params.phone, parseInt(limit)]
        );
        res.json(result.rows.reverse());
    } catch (error) {
        next(error);
    }
});

// Get stats
router.get('/stats', async (req, res, next) => {
    try {
        const [totalMessages, todayMessages, uniquePhones] = await Promise.all([
            query('SELECT COUNT(*) as count FROM livechat'),
            query("SELECT COUNT(*) as count FROM livechat WHERE created_at >= CURRENT_DATE"),
            query('SELECT COUNT(DISTINCT phone) as count FROM livechat')
        ]);

        res.json({
            total_messages: parseInt(totalMessages.rows[0].count),
            today_messages: parseInt(todayMessages.rows[0].count),
            unique_phones: parseInt(uniquePhones.rows[0].count)
        });
    } catch (error) {
        next(error);
    }
});

// Log outbound message
router.post('/outbound', async (req, res, next) => {
    try {
        const { message_id, message, media, mime_type, phone_bot, phone, phone_bot_id, status } = req.body;

        const result = await query(
            `INSERT INTO livechat 
             (message_id, message, media, mime_type, phone_bot, phone, phone_bot_id, direction, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'outbound', $8)
             RETURNING *`,
            [message_id, message, media, mime_type, phone_bot, phone, phone_bot_id, status || 'sent']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
