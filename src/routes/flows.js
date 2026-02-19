const express = require('express');
const router = express.Router();
const { query } = require('../db');

// Get all flows
router.get('/', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT f.*, f.type as flow_type, b.phone_number as bot_phone
            FROM flows f
            LEFT JOIN bots b ON f.bot_id = b.id
            ORDER BY f.updated_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// Get single flow with nodes and edges
router.get('/:id', async (req, res, next) => {
    try {
        const flowResult = await query('SELECT * FROM flows WHERE id = $1', [req.params.id]);
        if (flowResult.rows.length === 0) {
            return res.status(404).json({ error: 'Flow not found' });
        }

        const nodesResult = await query(
            'SELECT * FROM flow_nodes WHERE flow_id = $1 ORDER BY created_at',
            [req.params.id]
        );

        const edgesResult = await query(
            'SELECT * FROM flow_edges WHERE flow_id = $1',
            [req.params.id]
        );

        const variablesResult = await query(
            'SELECT * FROM flow_variables WHERE flow_id = $1',
            [req.params.id]
        );

        // Transform nodes/edges to ReactFlow format
        const nodes = nodesResult.rows.map(n => ({
            id: n.node_id,
            type: n.subtype || n.type,
            position: { x: n.position_x, y: n.position_y },
            data: { label: n.label, ...(n.config || {}) }
        }));

        const edges = edgesResult.rows.map(e => ({
            id: e.edge_id,
            source: e.source_node_id,
            sourceHandle: e.source_handle,
            target: e.target_node_id,
            targetHandle: e.target_handle,
            label: e.label,
            type: 'smoothstep',
            animated: true
        }));

        res.json({
            ...flowResult.rows[0],
            flow_type: flowResult.rows[0].type,
            canvas_data: { nodes, edges },
            variables: variablesResult.rows
        });
    } catch (error) {
        next(error);
    }
});

// Create new flow
router.post('/', async (req, res, next) => {
    try {
        const { name, description, type, flow_type, bot_id, config } = req.body;
        const flowType = flow_type || type || 'raffle';

        if (!name) {
            return res.status(400).json({ error: 'name is required' });
        }

        const result = await query(
            `INSERT INTO flows (name, description, type, bot_id, config)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, description || null, flowType, bot_id || null, config || {}]
        );

        const newFlow = result.rows[0];

        // Create default trigger node
        const triggerId = `trigger_${Date.now()}`;
        await query(
            `INSERT INTO flow_nodes (flow_id, node_id, type, subtype, label, position_x, position_y, config)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [newFlow.id, triggerId, 'trigger', 'trigger', 'טריגר התחלה', 250, 100, { triggerType: 'message', keyword: '' }]
        );

        res.status(201).json({ ...newFlow, flow_type: newFlow.type });
    } catch (error) {
        next(error);
    }
});

// Update flow
router.put('/:id', async (req, res, next) => {
    try {
        const { name, description, type, bot_id, is_active, config } = req.body;

        const result = await query(
            `UPDATE flows 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 type = COALESCE($3, type),
                 bot_id = $4,
                 is_active = COALESCE($5, is_active),
                 config = COALESCE($6, config)
             WHERE id = $7
             RETURNING *`,
            [name, description, type, bot_id, is_active, config, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Flow not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// Delete flow
router.delete('/:id', async (req, res, next) => {
    try {
        const result = await query('DELETE FROM flows WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Flow not found' });
        }
        res.json({ message: 'Flow deleted', flow: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

// Save flow canvas (nodes + edges) - support both POST and PUT
router.put('/:id/canvas', async (req, res, next) => {
    return saveCanvas(req, res, next);
});

router.post('/:id/canvas', async (req, res, next) => {
    return saveCanvas(req, res, next);
});

async function saveCanvas(req, res, next) {
    try {
        const { nodes, edges } = req.body;
        const flowId = req.params.id;

        // Verify flow exists
        const flowCheck = await query('SELECT id FROM flows WHERE id = $1', [flowId]);
        if (flowCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Flow not found' });
        }

        // Clear existing nodes and edges
        await query('DELETE FROM flow_nodes WHERE flow_id = $1', [flowId]);
        await query('DELETE FROM flow_edges WHERE flow_id = $1', [flowId]);

        // Insert nodes
        for (const node of nodes || []) {
            await query(
                `INSERT INTO flow_nodes (flow_id, node_id, type, subtype, label, position_x, position_y, config)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    flowId,
                    node.id,
                    node.type || 'custom',
                    node.data?.subtype || node.type,
                    node.data?.label || '',
                    node.position?.x || 0,
                    node.position?.y || 0,
                    node.data || {}
                ]
            );
        }

        // Insert edges
        for (const edge of edges || []) {
            await query(
                `INSERT INTO flow_edges (flow_id, edge_id, source_node_id, source_handle, target_node_id, target_handle, label)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    flowId,
                    edge.id,
                    edge.source,
                    edge.sourceHandle || null,
                    edge.target,
                    edge.targetHandle || null,
                    edge.label || null
                ]
            );
        }

        res.json({ success: true, nodes: nodes?.length || 0, edges: edges?.length || 0 });
    } catch (error) {
        next(error);
    }
}

// Get flow variables
router.get('/:id/variables', async (req, res, next) => {
    try {
        const result = await query(
            'SELECT * FROM flow_variables WHERE flow_id = $1 ORDER BY name',
            [req.params.id]
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// Add/update flow variable
router.post('/:id/variables', async (req, res, next) => {
    try {
        const { name, default_value, description, var_type } = req.body;

        const result = await query(
            `INSERT INTO flow_variables (flow_id, name, default_value, description, var_type)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (flow_id, name) DO UPDATE SET
                default_value = EXCLUDED.default_value,
                description = EXCLUDED.description,
                var_type = EXCLUDED.var_type
             RETURNING *`,
            [req.params.id, name, default_value, description, var_type || 'string']
        );

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

// Delete flow variable
router.delete('/:id/variables/:name', async (req, res, next) => {
    try {
        await query(
            'DELETE FROM flow_variables WHERE flow_id = $1 AND name = $2',
            [req.params.id, req.params.name]
        );
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Get raffle participants for a flow
router.get('/:id/participants', async (req, res, next) => {
    try {
        const result = await query(
            `SELECT * FROM raffle_participants 
             WHERE flow_id = $1 
             ORDER BY created_at DESC`,
            [req.params.id]
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// Get raffle stats
router.get('/:id/stats', async (req, res, next) => {
    try {
        const stats = await query(`
            SELECT 
                COUNT(*) as total_participants,
                SUM(cards) as total_cards,
                SUM(share_count) as total_shares,
                COUNT(CASE WHEN status LIKE '%שמר%' THEN 1 END) as saved_contacts,
                COUNT(CASE WHEN status LIKE '%שיתף%' THEN 1 END) as shared
            FROM raffle_participants
            WHERE flow_id = $1
        `, [req.params.id]);

        const top10 = await query(`
            SELECT phone, full_name, cards + share_count as total_entries
            FROM raffle_participants
            WHERE flow_id = $1
            ORDER BY (cards + share_count) DESC
            LIMIT 10
        `, [req.params.id]);

        res.json({
            ...stats.rows[0],
            top10: top10.rows
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
