const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Get all bots
router.get('/', async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM bots ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// Get single bot
router.get('/:id', async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM bots WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// Get bot by phone number
router.get('/phone/:phone', async (req, res, next) => {
    try {
        const result = await query('SELECT * FROM bots WHERE phone_number = $1', [req.params.phone]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// Create new bot
router.post('/', async (req, res, next) => {
    try {
        const {
            phone_number,
            phone_number_id,
            name,
            workflow_id,
            n8n_webhook_url,
            status = 'active',
            access_mode = 'everyone',
            dynamic_sql_template,
            active_from,
            active_until,
            delay_seconds = 0
        } = req.body;

        if (!phone_number) {
            return res.status(400).json({ error: 'phone_number is required' });
        }

        const result = await query(
            `INSERT INTO bots 
             (phone_number, phone_number_id, name, workflow_id, n8n_webhook_url, status, access_mode, dynamic_sql_template, active_from, active_until, delay_seconds)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [phone_number, phone_number_id, name, workflow_id, n8n_webhook_url, status, access_mode, dynamic_sql_template, active_from, active_until, delay_seconds]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Bot with this phone number already exists' });
        }
        next(error);
    }
});

// Update bot
router.put('/:id', async (req, res, next) => {
    try {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        const allowedFields = [
            'phone_number', 'phone_number_id', 'name', 'workflow_id', 'n8n_webhook_url',
            'status', 'access_mode', 'dynamic_sql_template', 'active_from', 'active_until', 'delay_seconds'
        ];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                fields.push(`${field} = $${paramIndex}`);
                values.push(req.body[field]);
                paramIndex++;
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(req.params.id);
        const result = await query(
            `UPDATE bots SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// Delete bot
router.delete('/:id', async (req, res, next) => {
    try {
        const result = await query('DELETE FROM bots WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        res.json({ message: 'Bot deleted', bot: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// Toggle bot status
router.patch('/:id/toggle', async (req, res, next) => {
    try {
        const result = await query(
            `UPDATE bots SET status = CASE WHEN status = 'active' THEN 'inactive' ELSE 'active' END WHERE id = $1 RETURNING *`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
