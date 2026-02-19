const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Dashboard stats
router.get('/stats', async (req, res, next) => {
    try {
        const [bots, blocked, messages, todayMessages] = await Promise.all([
            query('SELECT COUNT(*) as count FROM bots'),
            query('SELECT COUNT(*) as count FROM blocked_numbers'),
            query('SELECT COUNT(*) as count FROM livechat'),
            query("SELECT COUNT(*) as count FROM livechat WHERE created_at >= CURRENT_DATE")
        ]);

        res.json({
            bots: parseInt(bots.rows[0].count),
            blocked_numbers: parseInt(blocked.rows[0].count),
            total_messages: parseInt(messages.rows[0].count),
            today_messages: parseInt(todayMessages.rows[0].count)
        });
    } catch (error) {
        next(error);
    }
});

// Get all bots with stats
router.get('/bots-overview', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT 
                b.*,
                (SELECT COUNT(*) FROM whitelisted_numbers WHERE bot_id = b.id) as whitelist_count,
                (SELECT COUNT(*) FROM livechat WHERE phone_bot = b.phone_number) as message_count
            FROM bots b
            ORDER BY b.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
