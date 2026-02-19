const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Get all blocked numbers
router.get('/', async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM blocked_numbers ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// Check if phone is blocked
router.get('/check/:phone', async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM blocked_numbers WHERE phone = $1', [req.params.phone]);
        res.json({ blocked: result.rows.length > 0, data: result.rows[0] || null });
    } catch (error) {
        next(error);
    }
});

// Block a phone number
router.post('/', async (req, res, next) => {
    try {
        const { phone, reason, blocked_by } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'phone is required' });
        }

        const result = await query(
            `INSERT INTO blocked_numbers (phone, reason, blocked_by) VALUES ($1, $2, $3) RETURNING *`,
            [phone, reason, blocked_by]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Phone number is already blocked' });
        }
        next(error);
    }
});

// Block multiple phone numbers
router.post('/bulk', async (req, res, next) => {
    try {
        const { phones, reason, blocked_by } = req.body;

        if (!phones || !Array.isArray(phones) || phones.length === 0) {
            return res.status(400).json({ error: 'phones array is required' });
        }

        const results = [];
        const errors = [];

        for (const phone of phones) {
            try {
                const result = await query(
                    `INSERT INTO blocked_numbers (phone, reason, blocked_by) VALUES ($1, $2, $3) RETURNING *`,
                    [phone, reason, blocked_by]
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

// Unblock a phone number
router.delete('/:phone', async (req, res, next) => {
    try {
        const result = await query('DELETE FROM blocked_numbers WHERE phone = $1 RETURNING *', [req.params.phone]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Phone number not found in blocked list' });
        }
        res.json({ message: 'Phone number unblocked', data: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// Unblock multiple phone numbers
router.delete('/bulk/remove', async (req, res, next) => {
    try {
        const { phones } = req.body;

        if (!phones || !Array.isArray(phones) || phones.length === 0) {
            return res.status(400).json({ error: 'phones array is required' });
        }

        const result = await query(
            `DELETE FROM blocked_numbers WHERE phone = ANY($1) RETURNING *`,
            [phones]
        );

        res.json({ removed: result.rows.length, data: result.rows });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
