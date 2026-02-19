const { query } = require('../db');
const axios = require('axios');

class FlowExecutor {
    constructor() {
        this.activeExecutions = new Map();
    }

    async executeFlow(flowId, triggerData) {
        console.log(`[FLOW EXECUTOR] Starting flow ${flowId}`);
        
        try {
            // Get flow with nodes and edges
            const flowResult = await query('SELECT * FROM flows WHERE id = $1 AND is_active = true', [flowId]);
            if (flowResult.rows.length === 0) {
                console.log(`[FLOW EXECUTOR] Flow ${flowId} not found or not active`);
                return { success: false, reason: 'Flow not found or not active' };
            }

            const flow = flowResult.rows[0];
            
            const nodesResult = await query('SELECT * FROM flow_nodes WHERE flow_id = $1', [flowId]);
            const edgesResult = await query('SELECT * FROM flow_edges WHERE flow_id = $1', [flowId]);
            
            const nodes = nodesResult.rows;
            const edges = edgesResult.rows;
            
            // Create execution record
            const execResult = await query(
                `INSERT INTO flow_executions (flow_id, phone, trigger_data, status, variables)
                 VALUES ($1, $2, $3, 'running', $4)
                 RETURNING id`,
                [flowId, triggerData.phone, triggerData, { trigger: triggerData }]
            );
            const executionId = execResult.rows[0].id;
            
            // Find trigger node
            const triggerNode = nodes.find(n => n.type === 'trigger');
            if (!triggerNode) {
                await this.completeExecution(executionId, 'failed', 'No trigger node found');
                return { success: false, reason: 'No trigger node found' };
            }
            
            // Execute flow starting from trigger
            const result = await this.executeNode(
                triggerNode,
                nodes,
                edges,
                { ...triggerData, executionId },
                executionId
            );
            
            await this.completeExecution(executionId, 'completed');
            return { success: true, result };
            
        } catch (error) {
            console.error(`[FLOW EXECUTOR] Error:`, error);
            return { success: false, reason: error.message };
        }
    }

    async executeNode(node, allNodes, allEdges, context, executionId) {
        console.log(`[FLOW EXECUTOR] Executing node: ${node.node_id} (${node.subtype})`);
        
        const config = node.config || {};
        let output = null;
        
        try {
            // Execute based on node type
            switch (node.subtype) {
                case 'message_received':
                case 'button_click':
                case 'list_select':
                    output = { triggered: true, data: context };
                    break;
                    
                case 'send_text':
                    output = await this.executeSendText(config, context);
                    break;
                    
                case 'send_buttons':
                    output = await this.executeSendButtons(config, context);
                    break;
                    
                case 'send_list':
                    output = await this.executeSendList(config, context);
                    break;
                    
                case 'switch':
                    output = await this.executeSwitch(config, context);
                    break;
                    
                case 'filter':
                    output = await this.executeFilter(config, context);
                    break;
                    
                case 'wait':
                    await this.executeWait(config);
                    output = { waited: true };
                    break;
                    
                case 'sql_query':
                    output = await this.executeSqlQuery(config, context);
                    break;
                    
                case 'add_participant':
                    output = await this.executeAddParticipant(config, context);
                    break;
                    
                case 'update_participant':
                    output = await this.executeUpdateParticipant(config, context);
                    break;
                    
                case 'add_card':
                    output = await this.executeAddCard(config, context);
                    break;
                    
                default:
                    output = { unknown: true };
            }
            
            // Log execution
            await query(
                `UPDATE flow_executions 
                 SET execution_log = execution_log || $1::jsonb,
                     current_node_id = $2
                 WHERE id = $3`,
                [JSON.stringify([{ node: node.node_id, output, timestamp: new Date() }]), node.node_id, executionId]
            );
            
            // Find next nodes
            const outgoingEdges = allEdges.filter(e => e.source_node_id === node.node_id);
            
            // For switch nodes, select the right output
            if (node.subtype === 'switch' && output.selectedOutput) {
                const selectedEdge = outgoingEdges.find(e => e.source_handle === output.selectedOutput);
                if (selectedEdge) {
                    const nextNode = allNodes.find(n => n.node_id === selectedEdge.target_node_id);
                    if (nextNode) {
                        await this.executeNode(nextNode, allNodes, allEdges, { ...context, ...output }, executionId);
                    }
                }
            } else if (node.subtype === 'filter') {
                // Filter: only continue if passed
                if (output.passed) {
                    for (const edge of outgoingEdges) {
                        const nextNode = allNodes.find(n => n.node_id === edge.target_node_id);
                        if (nextNode) {
                            await this.executeNode(nextNode, allNodes, allEdges, { ...context, ...output }, executionId);
                        }
                    }
                }
            } else {
                // Execute all next nodes
                for (const edge of outgoingEdges) {
                    const nextNode = allNodes.find(n => n.node_id === edge.target_node_id);
                    if (nextNode) {
                        await this.executeNode(nextNode, allNodes, allEdges, { ...context, ...output }, executionId);
                    }
                }
            }
            
            return output;
            
        } catch (error) {
            console.error(`[FLOW EXECUTOR] Node ${node.node_id} error:`, error);
            throw error;
        }
    }

    // Node Executors
    async executeSendText(config, context) {
        const message = this.interpolate(config.message || '', context);
        console.log(`[FLOW] Sending text to ${context.phone}: ${message.substring(0, 50)}...`);
        
        // TODO: Integrate with WhatsApp API
        // For now, just log
        return { sent: true, message };
    }

    async executeSendButtons(config, context) {
        const message = this.interpolate(config.message || '', context);
        const buttons = (config.buttons || '').split('\n').filter(b => b.trim());
        console.log(`[FLOW] Sending buttons to ${context.phone}`);
        
        return { sent: true, message, buttons };
    }

    async executeSendList(config, context) {
        const message = this.interpolate(config.message || '', context);
        const listItems = (config.listItems || '').split('\n').filter(i => i.trim());
        console.log(`[FLOW] Sending list to ${context.phone}`);
        
        return { sent: true, message, listTitle: config.listTitle, listItems };
    }

    async executeSwitch(config, context) {
        const conditions = JSON.parse(config.conditions || '[]');
        
        for (let i = 0; i < conditions.length; i++) {
            const cond = conditions[i];
            const value = this.getNestedValue(context, cond.field);
            
            let matched = false;
            switch (cond.operator) {
                case 'equals':
                    matched = value == cond.value;
                    break;
                case 'contains':
                    matched = String(value).includes(cond.value);
                    break;
                case 'starts_with':
                    matched = String(value).startsWith(cond.value);
                    break;
                case 'gt':
                    matched = Number(value) > Number(cond.value);
                    break;
                case 'lt':
                    matched = Number(value) < Number(cond.value);
                    break;
            }
            
            if (matched) {
                return { selectedOutput: `output_${i}`, condition: cond };
            }
        }
        
        return { selectedOutput: 'default' };
    }

    async executeFilter(config, context) {
        const value = this.getNestedValue(context, config.field);
        
        let passed = false;
        switch (config.operator) {
            case 'equals':
                passed = value == config.value;
                break;
            case 'contains':
                passed = String(value).includes(config.value);
                break;
            case 'starts_with':
                passed = String(value).startsWith(config.value);
                break;
            case 'gt':
                passed = Number(value) > Number(config.value);
                break;
            case 'lt':
                passed = Number(value) < Number(config.value);
                break;
        }
        
        return { passed, field: config.field, value };
    }

    async executeWait(config) {
        const seconds = parseInt(config.waitSeconds) || 1;
        console.log(`[FLOW] Waiting ${seconds} seconds...`);
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    async executeSqlQuery(config, context) {
        const sql = this.interpolate(config.sql || '', context);
        console.log(`[FLOW] Executing SQL: ${sql.substring(0, 100)}...`);
        
        try {
            const result = await query(sql);
            return { success: true, rows: result.rows, rowCount: result.rowCount };
        } catch (error) {
            console.error(`[FLOW] SQL Error:`, error);
            return { success: false, error: error.message };
        }
    }

    async executeAddParticipant(config, context) {
        const flowId = context.flowId || config.flowId;
        const phone = context.phone;
        const fullName = context.name || context.full_name || '';
        
        try {
            const result = await query(
                `INSERT INTO raffle_participants (flow_id, phone, full_name, came_from, status)
                 VALUES ($1, $2, $3, $4, 'registered')
                 ON CONFLICT (flow_id, phone) DO UPDATE SET updated_at = NOW()
                 RETURNING *`,
                [flowId, phone, fullName, context.came_from || null]
            );
            return { success: true, participant: result.rows[0] };
        } catch (error) {
            console.error(`[FLOW] Add participant error:`, error);
            return { success: false, error: error.message };
        }
    }

    async executeUpdateParticipant(config, context) {
        const flowId = context.flowId || config.flowId;
        const phone = context.phone;
        const updates = config.updates || {};
        
        try {
            const result = await query(
                `UPDATE raffle_participants 
                 SET status = COALESCE($1, status),
                     full_name = COALESCE($2, full_name),
                     extra_data = extra_data || $3::jsonb
                 WHERE flow_id = $4 AND phone = $5
                 RETURNING *`,
                [updates.status, updates.full_name, updates.extra || {}, flowId, phone]
            );
            return { success: true, participant: result.rows[0] };
        } catch (error) {
            console.error(`[FLOW] Update participant error:`, error);
            return { success: false, error: error.message };
        }
    }

    async executeAddCard(config, context) {
        const flowId = context.flowId || config.flowId;
        const phone = context.phone;
        const cardCount = parseInt(config.cardCount) || 1;
        
        try {
            const result = await query(
                `UPDATE raffle_participants 
                 SET cards = cards + $1
                 WHERE flow_id = $2 AND phone = $3
                 RETURNING *`,
                [cardCount, flowId, phone]
            );
            return { success: true, participant: result.rows[0], added: cardCount };
        } catch (error) {
            console.error(`[FLOW] Add card error:`, error);
            return { success: false, error: error.message };
        }
    }

    async completeExecution(executionId, status, errorMessage = null) {
        await query(
            `UPDATE flow_executions 
             SET status = $1, completed_at = NOW(), error_message = $2
             WHERE id = $3`,
            [status, errorMessage, executionId]
        );
    }

    // Helpers
    interpolate(text, context) {
        return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
            return this.getNestedValue(context, path) || match;
        });
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
}

module.exports = new FlowExecutor();
