const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Get all whitelisted numbers for a bot
router.get('/bot/:botId', async (req, res, next) => {
    try {
        const result = await query(
            'SELECT * FROM whitelisted_numbers WHERE bot_id = $1 ORDER BY created_at DESC',
            [req.params.botId]
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// Check if phone is whitelisted for a bot
router.get('/check/:botId/:phone', async (req, res, next) => {
    try {
        const result = await query(
            'SELECT * FROM whitelisted_numbers WHERE bot_id = $1 AND phone = $2',
            [req.params.botId, req.params.phone]
        );
        res.json({ whitelisted: result.rows.length > 0, data: result.rows[0] || null });
    } catch (error) {
        next(error);
    }
});

// Add phone to whitelist
router.post('/', async (req, res, next) => {
    try {
        const { bot_id, phone, added_by } = req.body;

        if (!bot_id || !phone) {
            return res.status(400).json({ error: 'bot_id and phone are required' });
        }

        const result = await query(
            `INSERT INTO whitelisted_numbers (bot_id, phone, added_by) VALUES ($1, $2, $3) RETURNING *`,
            [bot_id, phone, added_by]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Phone number is already whitelisted for this bot' });
        }
        if (error.code === '23503') {
            return res.status(404).json({ error: 'Bot not found' });
        }
        next(error);
    }
});

// Add multiple phones to whitelist
router.post('/bulk', async (req, res, next) => {
    try {
        const { bot_id, phones, added_by } = req.body;

        if (!bot_id || !phones || !Array.isArray(phones) || phones.length === 0) {
            return res.status(400).json({ error: 'bot_id and phones array are required' });
        }

        const results = [];
        const errors = [];

        for (const phone of phones) {
            try {
                const result = await query(
                    `INSERT INTO whitelisted_numbers (bot_id, phone, added_by) VALUES ($1, $2, $3) RETURNING *`,
                    [bot_id, phone, added_by]
                );
                results.push(result.rows[0]);
            } catch (error) {
                errors.push({ phone, error: error.message });
            }
        }

        res.status(201).json({ added: results, errors });
    } catch (error) {
        next(error);
    }
});

// Remove phone from whitelist
router.delete('/:botId/:phone', async (req, res, next) => {
    try {
        const result = await query(
            'DELETE FROM whitelisted_numbers WHERE bot_id = $1 AND phone = $2 RETURNING *',
            [req.params.botId, req.params.phone]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Phone number not found in whitelist' });
        }
        res.json({ message: 'Phone number removed from whitelist', data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// Remove all phones from bot whitelist
router.delete('/bot/:botId/clear', async (req, res, next) => {
    try {
        const result = await query(
            'DELETE FROM whitelisted_numbers WHERE bot_id = $1 RETURNING *',
            [req.params.botId]
        );
        res.json({ removed: result.rows.length, data: result.rows });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
