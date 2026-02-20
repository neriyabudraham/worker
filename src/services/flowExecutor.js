const { query } = require('../db');
const { WhatsAppService } = require('./whatsapp');

class FlowExecutor {
    async executeFlow(flowId, messageData, originalPayload) {
        console.log('[FLOW] ========================================');
        console.log('[FLOW] Starting flow execution');
        console.log('[FLOW] Flow ID:', flowId);
        console.log('[FLOW] Phone:', messageData.phone);
        console.log('[FLOW] Message:', messageData.message);
        
        try {
            // Get flow and its nodes
            const flowResult = await query('SELECT * FROM flows WHERE id = $1', [flowId]);
            if (flowResult.rows.length === 0) {
                console.log('[FLOW] ERROR: Flow not found:', flowId);
                return { success: false, error: 'Flow not found' };
            }
            
            const flow = flowResult.rows[0];
            console.log('[FLOW] Flow name:', flow.name);
            
            // Get all nodes for this flow
            const nodesResult = await query(
                'SELECT * FROM flow_nodes WHERE flow_id = $1 ORDER BY created_at',
                [flowId]
            );
            const nodes = nodesResult.rows;
            console.log('[FLOW] Found', nodes.length, 'nodes');
            nodes.forEach(n => console.log('[FLOW]   -', n.type, ':', n.label || n.node_id));
            
            // Get all edges for this flow
            const edgesResult = await query(
                'SELECT * FROM flow_edges WHERE flow_id = $1',
                [flowId]
            );
            const edges = edgesResult.rows;
            console.log('[FLOW] Found', edges.length, 'edges');
            
            // Find the trigger node
            const triggerNode = nodes.find(n => n.type === 'trigger');
            if (!triggerNode) {
                console.log('[FLOW] ERROR: No trigger node found');
                return { success: false, error: 'No trigger node' };
            }
            console.log('[FLOW] Trigger node config:', JSON.stringify(triggerNode.config));
            
            // Get bot credentials from trigger config
            const botId = triggerNode.config?.bot_id;
            if (!botId) {
                console.log('[FLOW] ERROR: No bot_id in trigger config');
                console.log('[FLOW] This flow needs to be configured with a WhatsApp number in the trigger node');
                return { success: false, error: 'No bot configured in trigger' };
            }
            console.log('[FLOW] Bot ID from trigger:', botId);
            
            // Get bot with credentials
            const botResult = await query(
                'SELECT * FROM bots WHERE id = $1',
                [botId]
            );
            
            if (botResult.rows.length === 0) {
                console.log('[FLOW] Bot not found:', botId);
                return { success: false, error: 'Bot not found' };
            }
            
            const bot = botResult.rows[0];
            
            if (!bot.phone_number_id || !bot.access_token) {
                console.log('[FLOW] Bot missing WhatsApp credentials');
                return { success: false, error: 'Bot missing WhatsApp credentials' };
            }
            
            // Create WhatsApp service
            const wa = new WhatsAppService(bot.phone_number_id, bot.access_token);
            
            // Create execution context
            const context = {
                flowId,
                flow,
                nodes,
                edges,
                wa,
                bot,
                phone: messageData.phone,
                message: messageData.message,
                messageData,
                originalPayload,
                variables: {}
            };
            
            // Create execution log
            const execResult = await query(
                `INSERT INTO flow_executions (flow_id, phone, trigger_data, status)
                 VALUES ($1, $2, $3, 'running')
                 RETURNING id`,
                [flowId, messageData.phone, JSON.stringify(originalPayload)]
            );
            const executionId = execResult.rows[0].id;
            context.executionId = executionId;
            
            // Start execution from trigger node
            await this.executeFromNode(context, triggerNode.node_id);
            
            // Mark execution as complete
            await query(
                `UPDATE flow_executions SET status = 'completed', completed_at = NOW() WHERE id = $1`,
                [executionId]
            );
            
            console.log('[FLOW] Execution completed');
            return { success: true };
            
        } catch (error) {
            console.error('[FLOW] Execution error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async executeFromNode(context, nodeId) {
        const node = context.nodes.find(n => n.node_id === nodeId);
        if (!node) {
            console.log('[FLOW] Node not found:', nodeId);
            return;
        }
        
        console.log('[FLOW] Executing node:', node.type, '|', node.label);
        
        // Execute the node
        await this.executeNode(context, node);
        
        // Find next nodes via edges
        const outgoingEdges = context.edges.filter(e => e.source_node_id === nodeId);
        
        for (const edge of outgoingEdges) {
            await this.executeFromNode(context, edge.target_node_id);
        }
    }
    
    async executeNode(context, node) {
        const config = node.config || {};
        
        switch (node.type) {
            case 'trigger':
                // Trigger is just the entry point, nothing to execute
                console.log('[FLOW] Trigger node - passing through');
                break;
                
            case 'message':
                await this.executeMessageNode(context, config);
                break;
            
            case 'list':
                await this.executeListNode(context, config);
                break;
                
            case 'delay':
                await this.executeDelayNode(context, config);
                break;
                
            case 'condition':
                // TODO: Implement condition logic
                console.log('[FLOW] Condition node - not yet implemented');
                break;
                
            case 'action':
                await this.executeActionNode(context, config);
                break;
                
            case 'database':
                await this.executeDatabaseNode(context, config);
                break;
                
            default:
                console.log('[FLOW] Unknown node type:', node.type);
        }
    }
    
    async executeMessageNode(context, config) {
        console.log('[FLOW] Message node config:', JSON.stringify(config));
        
        const text = this.replaceVariables(config.text || '', context);
        const buttons = config.buttons || [];
        
        console.log('[FLOW] Sending message to:', context.phone);
        console.log('[FLOW] Message text:', text ? text.substring(0, 100) : '(empty)');
        console.log('[FLOW] Buttons count:', buttons.length);
        
        if (!text && buttons.length === 0) {
            console.log('[FLOW] Skipping empty message');
            return;
        }
        
        try {
            if (buttons.length > 0 && text) {
                console.log('[FLOW] Sending button message with', buttons.length, 'buttons');
                await context.wa.sendButtonMessage(context.phone, text, buttons);
            } else if (text) {
                console.log('[FLOW] Sending text message');
                await context.wa.sendTextMessage(context.phone, text);
            }
            console.log('[FLOW] Message sent successfully');
        } catch (error) {
            console.error('[FLOW] Failed to send message:', error);
            console.error('[FLOW] Error details:', JSON.stringify(error));
        }
    }
    
    async executeListNode(context, config) {
        console.log('[FLOW] List node config:', JSON.stringify(config));
        
        const title = this.replaceVariables(config.title || 'בחר אופציה', context);
        const body = this.replaceVariables(config.body || '', context);
        const buttonText = config.buttonText || 'בחר';
        const items = config.items || [];
        
        console.log('[FLOW] Sending list to:', context.phone);
        console.log('[FLOW] List title:', title);
        console.log('[FLOW] Items count:', items.length);
        
        if (items.length === 0) {
            console.log('[FLOW] Skipping empty list');
            return;
        }
        
        try {
            await context.wa.sendListMessage(context.phone, {
                title,
                body: body || title,
                buttonText,
                sections: [{
                    title: title,
                    rows: items.map((item, index) => ({
                        id: item.id || `item_${index}`,
                        title: typeof item === 'string' ? item : (item.title || `פריט ${index + 1}`),
                        description: item.description || ''
                    }))
                }]
            });
            console.log('[FLOW] List sent successfully');
        } catch (error) {
            console.error('[FLOW] Failed to send list:', error);
            console.error('[FLOW] Error details:', JSON.stringify(error));
        }
    }
    
    async executeDelayNode(context, config) {
        const duration = config.duration || 1;
        const unit = config.unit || 'seconds';
        
        let ms = duration * 1000;
        if (unit === 'minutes') ms = duration * 60 * 1000;
        if (unit === 'hours') ms = duration * 60 * 60 * 1000;
        
        console.log('[FLOW] Delaying for:', duration, unit);
        await this.sleep(ms);
    }
    
    async executeActionNode(context, config) {
        const actionType = config.actionType;
        
        switch (actionType) {
            case 'setVariable':
                context.variables[config.variable] = config.value;
                console.log('[FLOW] Set variable:', config.variable, '=', config.value);
                break;
            default:
                console.log('[FLOW] Unknown action type:', actionType);
        }
    }
    
    async executeDatabaseNode(context, config) {
        const operation = config.operation;
        
        switch (operation) {
            case 'addParticipant':
                await this.addRaffleParticipant(context);
                break;
            case 'addCard':
                await this.addParticipantCard(context);
                break;
            case 'query':
                const result = await this.executeCustomQuery(config.sql, context);
                context.variables.queryResult = result;
                break;
            default:
                console.log('[FLOW] Unknown database operation:', operation);
        }
    }
    
    async addRaffleParticipant(context) {
        try {
            await query(
                `INSERT INTO raffle_participants (flow_id, phone, full_name, status)
                 VALUES ($1, $2, $3, 'registered')
                 ON CONFLICT (flow_id, phone) DO NOTHING`,
                [context.flowId, context.phone, context.messageData.contactName || '']
            );
            console.log('[FLOW] Added raffle participant:', context.phone);
        } catch (error) {
            console.error('[FLOW] Failed to add participant:', error.message);
        }
    }
    
    async addParticipantCard(context) {
        try {
            await query(
                `UPDATE raffle_participants SET cards = cards + 1 WHERE flow_id = $1 AND phone = $2`,
                [context.flowId, context.phone]
            );
            console.log('[FLOW] Added card for:', context.phone);
        } catch (error) {
            console.error('[FLOW] Failed to add card:', error.message);
        }
    }
    
    async executeCustomQuery(sqlTemplate, context) {
        try {
            const sql = this.replaceVariables(sqlTemplate, context);
            const result = await query(sql);
            return result.rows;
        } catch (error) {
            console.error('[FLOW] Custom query error:', error.message);
            return [];
        }
    }
    
    replaceVariables(text, context) {
        if (!text) return '';
        
        return text
            .replace(/{{phone}}/g, context.phone || '')
            .replace(/{{message}}/g, context.message || '')
            .replace(/{{name}}/g, context.messageData?.contactName || '')
            .replace(/{{bot_phone}}/g, context.bot?.phone_number || '')
            .replace(/\{\{(\w+)\}\}/g, (match, varName) => {
                return context.variables[varName] || match;
            });
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new FlowExecutor();
