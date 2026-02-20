const { query } = require('../db');
const { WhatsAppService } = require('./whatsapp');

class FlowExecutor {
    /**
     * Check if there's an active session for this phone/flow
     * Handle based on message type:
     * - Text message: Start new flow
     * - Button click: Execute button path (each button clickable once)
     * - List selection: Execute item path (can select multiple times)
     */
    async handleIncomingMessage(flowId, messageData, originalPayload) {
        console.log('[FLOW] ========================================');
        console.log('[FLOW] Handling incoming message');
        console.log('[FLOW] Flow ID:', flowId);
        console.log('[FLOW] Phone:', messageData.phone);
        console.log('[FLOW] Message:', messageData.message);
        console.log('[FLOW] Type:', messageData.type);
        
        // Extract message details
        const waMessage = originalPayload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        const contextMessageId = waMessage?.context?.id;
        const interactive = waMessage?.interactive;
        const isButtonReply = interactive?.type === 'button_reply';
        const isListReply = interactive?.type === 'list_reply';
        const isTextMessage = waMessage?.type === 'text';
        
        console.log('[FLOW] Context message ID:', contextMessageId || 'none');
        console.log('[FLOW] Message type: ', isButtonReply ? 'BUTTON' : isListReply ? 'LIST' : isTextMessage ? 'TEXT' : 'OTHER');
        
        // ============================================
        // CASE 1: Text message - Always start fresh flow
        // ============================================
        if (isTextMessage) {
            console.log('[FLOW] TEXT MESSAGE - Starting new flow');
            return await this.executeFlow(flowId, messageData, originalPayload);
        }
        
        // ============================================
        // CASE 2: Button reply - Execute button path (unlimited clicks)
        // ============================================
        if (isButtonReply && contextMessageId) {
            const buttonId = interactive.button_reply.id;
            const buttonTitle = interactive.button_reply.title;
            console.log('[FLOW] BUTTON REPLY - ID:', buttonId, 'Title:', buttonTitle);
            
            // Execute button path (no click limit)
            return await this.executeButtonPath(flowId, messageData, originalPayload, contextMessageId, buttonId);
        }
        
        // ============================================
        // CASE 3: List reply - Execute item path (can select multiple times)
        // ============================================
        if (isListReply && contextMessageId) {
            const itemId = interactive.list_reply.id;
            const itemTitle = interactive.list_reply.title;
            console.log('[FLOW] LIST REPLY - ID:', itemId, 'Title:', itemTitle);
            
            // Always execute list selection (no "already clicked" check)
            return await this.executeButtonPath(flowId, messageData, originalPayload, contextMessageId, itemId);
        }
        
        // ============================================
        // CASE 4: Other interactive or fallback
        // ============================================
        console.log('[FLOW] Unknown message type, starting new flow');
        return await this.executeFlow(flowId, messageData, originalPayload);
    }
    
    /**
     * Execute the path for a specific button/list item
     * Uses message ID to find which node sent the message being replied to
     */
    async executeButtonPath(flowId, messageData, originalPayload, contextMessageId, selectedId) {
        console.log('[FLOW] ========================================');
        console.log('[FLOW] Executing button/list path');
        console.log('[FLOW] Context message ID:', contextMessageId);
        console.log('[FLOW] Selected ID:', selectedId);
        
        try {
            const context = await this.buildContext(flowId, messageData, originalPayload);
            if (!context) {
                return { success: false, error: 'Failed to build context' };
            }
            
            // FIRST: Try to find the node that sent this message by message ID
            let sourceNodeId = null;
            
            const sentMsgResult = await query(
                `SELECT node_id FROM flow_sent_messages WHERE message_id = $1`,
                [contextMessageId]
            );
            
            if (sentMsgResult.rows.length > 0) {
                sourceNodeId = sentMsgResult.rows[0].node_id;
                console.log('[FLOW] Found source node by message ID:', sourceNodeId);
            } else {
                // Fallback: Try to find from session (for backward compatibility)
                console.log('[FLOW] Message not found in sent_messages, checking session...');
                const sessionResult = await query(
                    `SELECT fs.current_node_id, fs.variables, fs.id as session_id
                     FROM flow_sessions fs
                     WHERE fs.flow_id = $1 AND fs.phone = $2 AND fs.status = 'active'
                     ORDER BY fs.updated_at DESC LIMIT 1`,
                    [flowId, messageData.phone]
                );
                
                if (sessionResult.rows.length > 0) {
                    sourceNodeId = sessionResult.rows[0].current_node_id;
                    context.variables = sessionResult.rows[0].variables || {};
                    console.log('[FLOW] Found source node from session:', sourceNodeId);
                }
            }
            
            if (!sourceNodeId) {
                console.log('[FLOW] ERROR: Could not find source node');
                return { success: false, error: 'Could not find source node' };
            }
            
            // Save selection to variables
            context.variables = context.variables || {};
            context.variables.last_selection = messageData.message;
            context.variables.last_selection_id = selectedId;
            
            // Find edges from source node that match the selected button/item
            // Handle IDs are simple numeric strings: "0", "1", "2" etc.
            const numericId = selectedId.replace(/[^0-9]/g, ''); // Extract numeric part
            
            console.log('[FLOW] Looking for edges from node:', sourceNodeId);
            console.log('[FLOW] All edges from this node:', context.edges.filter(e => e.source_node_id === sourceNodeId).map(e => e.source_handle));
            
            const matchingEdges = context.edges.filter(e => 
                e.source_node_id === sourceNodeId && 
                (e.source_handle === selectedId || 
                 e.source_handle === numericId ||
                 e.source_handle === `btn_${numericId}` || 
                 e.source_handle === `item_${numericId}`)
            );
            
            console.log('[FLOW] Found', matchingEdges.length, 'matching edges for selectedId:', selectedId, 'numericId:', numericId);
            
            if (matchingEdges.length === 0) {
                console.log('[FLOW] No matching edges found');
                return { success: false, error: 'No path for this selection' };
            }
            
            // Create or get session for tracking
            let sessionId = null;
            const existingSession = await query(
                `SELECT id FROM flow_sessions WHERE flow_id = $1 AND phone = $2 ORDER BY created_at DESC LIMIT 1`,
                [flowId, messageData.phone]
            );
            
            if (existingSession.rows.length > 0) {
                sessionId = existingSession.rows[0].id;
                // Update session to active if it was completed
                await query(`UPDATE flow_sessions SET status = 'active', updated_at = NOW() WHERE id = $1`, [sessionId]);
            } else {
                // Create new session
                const newSession = await query(
                    `INSERT INTO flow_sessions (flow_id, phone, current_node_id, variables, status)
                     VALUES ($1, $2, $3, $4, 'active') RETURNING id`,
                    [flowId, messageData.phone, sourceNodeId, JSON.stringify(context.variables)]
                );
                sessionId = newSession.rows[0].id;
            }
            
            // Execute ALL matching edges (support multiple connections from same button)
            for (const edge of matchingEdges) {
                console.log('[FLOW] Executing path to:', edge.target_node_id);
                await this.executeFromNode(context, edge.target_node_id, sessionId);
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('[FLOW] Error executing button path:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Handle response to a waiting session (button click, list selection, etc.)
     */
    async handleSessionResponse(session, messageData, originalPayload) {
        console.log('[FLOW] ========================================');
        console.log('[FLOW] Handling session response');
        console.log('[FLOW] Session ID:', session.id);
        console.log('[FLOW] Current node:', session.current_node_id);
        console.log('[FLOW] Waiting for:', session.waiting_for);
        console.log('[FLOW] Waiting options:', JSON.stringify(session.waiting_options));
        
        try {
            // Get flow context
            const context = await this.buildContext(session.flow_id, messageData, originalPayload);
            if (!context) {
                console.log('[FLOW] ERROR: Failed to build context');
                return { success: false, error: 'Failed to build context' };
            }
            
            // Restore variables from session
            context.variables = session.variables || {};
            context.executionId = session.execution_id;
            console.log('[FLOW] Restored variables:', JSON.stringify(context.variables));
            
            // Get the button/list selection
            const interactiveMessage = originalPayload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive;
            let selectedId = null;
            let selectedTitle = null;
            
            console.log('[FLOW] Interactive message:', JSON.stringify(interactiveMessage));
            
            if (interactiveMessage?.button_reply) {
                selectedId = interactiveMessage.button_reply.id;
                selectedTitle = interactiveMessage.button_reply.title;
                console.log('[FLOW] BUTTON REPLY detected');
                console.log('[FLOW]   ID:', selectedId);
                console.log('[FLOW]   Title:', selectedTitle);
            } else if (interactiveMessage?.list_reply) {
                selectedId = interactiveMessage.list_reply.id;
                selectedTitle = interactiveMessage.list_reply.title;
                console.log('[FLOW] LIST REPLY detected');
                console.log('[FLOW]   ID:', selectedId);
                console.log('[FLOW]   Title:', selectedTitle);
            } else {
                // Text response
                selectedTitle = messageData.message;
                console.log('[FLOW] TEXT response:', selectedTitle);
            }
            
            // Save selected value to variables
            context.variables.last_selection = selectedTitle;
            context.variables.last_selection_id = selectedId;
            
            // Find the current node
            const currentNode = context.nodes.find(n => n.node_id === session.current_node_id);
            if (!currentNode) {
                console.log('[FLOW] ERROR: Current node not found:', session.current_node_id);
                return { success: false, error: 'Node not found' };
            }
            console.log('[FLOW] Current node type:', currentNode.type);
            console.log('[FLOW] Current node config:', JSON.stringify(currentNode.config));
            
            // Get outgoing edges from current node
            const outgoingEdges = context.edges.filter(e => e.source_node_id === session.current_node_id);
            console.log('[FLOW] Outgoing edges count:', outgoingEdges.length);
            outgoingEdges.forEach((e, i) => {
                console.log(`[FLOW]   Edge ${i}: sourceHandle="${e.source_handle}" -> ${e.target_node_id}`);
            });
            
            // Find the matching edge based on button index from the waiting options
            let targetEdge = null;
            
            if (selectedId && session.waiting_options) {
                // Find which button index was clicked
                const waitingOptions = session.waiting_options;
                const clickedOption = waitingOptions.find(opt => opt.id === selectedId);
                
                if (clickedOption) {
                    const optionIndex = waitingOptions.indexOf(clickedOption);
                    console.log('[FLOW] Clicked option index:', optionIndex);
                    console.log('[FLOW] Looking for edge with sourceHandle:', optionIndex);
                    
                    // New format: simple numeric string "0", "1", "2"
                    targetEdge = outgoingEdges.find(e => e.source_handle === String(optionIndex));
                    
                    // Fallback: legacy format "btn_0", "btn_1"
                    if (!targetEdge) {
                        targetEdge = outgoingEdges.find(e => e.source_handle === `btn_${optionIndex}`);
                    }
                }
                
                // Fallback: try direct ID matching
                if (!targetEdge) {
                    const numericId = selectedId.replace(/[^0-9]/g, '');
                    console.log('[FLOW] Trying direct ID match for:', selectedId, 'numeric:', numericId);
                    targetEdge = outgoingEdges.find(e => 
                        e.source_handle === selectedId || 
                        e.source_handle === numericId ||
                        e.source_handle === `btn_${numericId}` ||
                        e.source_handle === `item_${numericId}`
                    );
                }
            }
            
            // If no specific edge found, use first available
            if (!targetEdge && outgoingEdges.length > 0) {
                console.log('[FLOW] No specific edge found, using first available');
                targetEdge = outgoingEdges[0];
            }
            
            if (!targetEdge) {
                console.log('[FLOW] No outgoing edge found, ending flow');
                await this.endSession(session.id);
                return { success: true, ended: true };
            }
            
            console.log('[FLOW] Selected edge:', targetEdge.edge_id);
            console.log('[FLOW] Target node:', targetEdge.target_node_id);
            
            // Get the context message ID to track which message was responded to
            const contextMessageId = originalPayload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.context?.id;
            
            // Update session to clear waiting state and store the message we responded to
            await query(
                `UPDATE flow_sessions SET waiting_for = NULL, waiting_options = NULL, 
                 variables = $1, last_message_id = $2, updated_at = NOW() WHERE id = $3`,
                [JSON.stringify(context.variables), contextMessageId, session.id]
            );
            
            // Continue execution from target node
            console.log('[FLOW] Continuing to node:', targetEdge.target_node_id);
            await this.executeFromNode(context, targetEdge.target_node_id, session.id);
            
            return { success: true };
            
        } catch (error) {
            console.error('[FLOW] Session response error:', error);
            console.error('[FLOW] Error stack:', error.stack);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Start a new flow execution
     */
    async executeFlow(flowId, messageData, originalPayload) {
        console.log('[FLOW] Starting flow execution');
        console.log('[FLOW] Flow ID:', flowId);
        
        try {
            const context = await this.buildContext(flowId, messageData, originalPayload);
            if (!context) {
                return { success: false, error: 'Failed to build context' };
            }
            
            // Find the trigger node
            const triggerNode = context.nodes.find(n => n.type === 'trigger');
            if (!triggerNode) {
                console.log('[FLOW] ERROR: No trigger node found');
                return { success: false, error: 'No trigger node' };
            }
            
            // Clear any existing session for this phone/flow
            await query(
                `UPDATE flow_sessions SET status = 'expired' WHERE flow_id = $1 AND phone = $2 AND status = 'active'`,
                [flowId, messageData.phone]
            );
            
            // Create execution log
            const execResult = await query(
                `INSERT INTO flow_executions (flow_id, phone, trigger_data, status)
                 VALUES ($1, $2, $3, 'running')
                 RETURNING id`,
                [flowId, messageData.phone, JSON.stringify(originalPayload)]
            );
            const executionId = execResult.rows[0].id;
            context.executionId = executionId;
            
            // Create new session
            const sessionResult = await query(
                `INSERT INTO flow_sessions (flow_id, phone, current_node_id, execution_id, status)
                 VALUES ($1, $2, $3, $4, 'active')
                 ON CONFLICT (flow_id, phone) DO UPDATE SET 
                    current_node_id = $3, execution_id = $4, status = 'active',
                    waiting_for = NULL, waiting_options = NULL, variables = '{}',
                    updated_at = NOW()
                 RETURNING id`,
                [flowId, messageData.phone, triggerNode.node_id, executionId]
            );
            const sessionId = sessionResult.rows[0].id;
            
            // Start execution from trigger node
            await this.executeFromNode(context, triggerNode.node_id, sessionId);
            
            return { success: true };
            
        } catch (error) {
            console.error('[FLOW] Execution error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Build execution context
     */
    async buildContext(flowId, messageData, originalPayload) {
        // Get flow
        const flowResult = await query('SELECT * FROM flows WHERE id = $1', [flowId]);
        if (flowResult.rows.length === 0) {
            console.log('[FLOW] ERROR: Flow not found:', flowId);
            return null;
        }
        const flow = flowResult.rows[0];
        
        // Get nodes
        const nodesResult = await query(
            'SELECT * FROM flow_nodes WHERE flow_id = $1 ORDER BY created_at',
            [flowId]
        );
        const nodes = nodesResult.rows;
        console.log('[FLOW] Found', nodes.length, 'nodes');
        
        // Get edges
        const edgesResult = await query(
            'SELECT * FROM flow_edges WHERE flow_id = $1',
            [flowId]
        );
        const edges = edgesResult.rows;
        console.log('[FLOW] Found', edges.length, 'edges');
        
        // Get trigger node for bot credentials
        const triggerNode = nodes.find(n => n.type === 'trigger');
        const botId = triggerNode?.config?.bot_id;
        
        if (!botId) {
            console.log('[FLOW] ERROR: No bot_id in trigger config');
            return null;
        }
        
        // Get bot
        const botResult = await query('SELECT * FROM bots WHERE id = $1', [botId]);
        if (botResult.rows.length === 0 || !botResult.rows[0].phone_number_id || !botResult.rows[0].access_token) {
            console.log('[FLOW] Bot not found or missing credentials');
            return null;
        }
        const bot = botResult.rows[0];
        
        // Create WhatsApp service
        const wa = new WhatsAppService(bot.phone_number_id, bot.access_token);
        
        return {
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
    }
    
    /**
     * Execute from a specific node, with wait support
     */
    async executeFromNode(context, nodeId, sessionId) {
        const node = context.nodes.find(n => n.node_id === nodeId);
        if (!node) {
            console.log('[FLOW] Node not found:', nodeId);
            return;
        }
        
        console.log('[FLOW] Executing node:', node.type, '|', node.label || nodeId);
        
        // Update session with current node
        await query(
            `UPDATE flow_sessions SET current_node_id = $1, variables = $2, updated_at = NOW() WHERE id = $3`,
            [nodeId, JSON.stringify(context.variables), sessionId]
        );
        
        // Execute the node and check if we need to wait
        const shouldWait = await this.executeNode(context, node, sessionId);
        
        if (shouldWait) {
            console.log('[FLOW] Node requires wait, pausing execution');
            return; // Stop execution here - will continue when user responds
        }
        
        // Find ALL outgoing edges from default handle (support multiple connections)
        const outgoingEdges = context.edges.filter(e => e.source_node_id === nodeId);
        const defaultEdges = outgoingEdges.filter(e => 
            !e.source_handle || e.source_handle === '' || e.source_handle === 'next'
        );
        
        // If no default edges but there are other edges, this node waits for button click
        if (defaultEdges.length === 0 && outgoingEdges.length > 0) {
            console.log('[FLOW] Node has button edges only, waiting for user click');
            return;
        }
        
        if (defaultEdges.length === 0) {
            // No more edges - flow complete
            console.log('[FLOW] No more edges, flow complete');
            await this.endSession(sessionId);
            return;
        }
        
        // Execute ALL default edges (support multiple connections from same handle)
        console.log('[FLOW] Following', defaultEdges.length, 'outgoing edges');
        for (const edge of defaultEdges) {
            await this.executeFromNode(context, edge.target_node_id, sessionId);
        }
    }
    
    /**
     * Execute a single node
     * Returns true if execution should wait for user input
     */
    async executeNode(context, node, sessionId) {
        const config = node.config || {};
        
        switch (node.type) {
            case 'trigger':
                console.log('[FLOW] Trigger node - passing through');
                return false;
                
            case 'message':
                return await this.executeMessageNode(context, config, node, sessionId);
            
            case 'list':
                return await this.executeListNode(context, config, node, sessionId);
                
            case 'delay':
                await this.executeDelayNode(context, config);
                return false;
                
            case 'condition':
                console.log('[FLOW] Condition node - not yet implemented');
                return false;
                
            case 'action':
                await this.executeActionNode(context, config);
                return false;
                
            case 'database':
                await this.executeDatabaseNode(context, config);
                return false;
                
            default:
                console.log('[FLOW] Unknown node type:', node.type);
                return false;
        }
    }
    
    /**
     * Execute message node - returns true if has buttons/list (waits for click)
     */
    async executeMessageNode(context, config, node, sessionId) {
        console.log('[FLOW] ----------------------------------------');
        console.log('[FLOW] Executing MESSAGE node');
        console.log('[FLOW] Node ID:', node.node_id);
        console.log('[FLOW] Config:', JSON.stringify(config));
        
        const text = this.replaceVariables(config.text || '', context);
        const buttons = config.buttons || [];
        
        console.log('[FLOW] To:', context.phone);
        console.log('[FLOW] Text:', text ? text.substring(0, 100) : '(empty)');
        console.log('[FLOW] Buttons:', buttons.length > 0 ? JSON.stringify(buttons) : 'none');
        
        if (!text && buttons.length === 0) {
            console.log('[FLOW] Skipping empty message');
            return false;
        }
        
        try {
            if (buttons.length > 0 && text) {
                console.log('[FLOW] Sending BUTTON message');
                
                // Send the message
                const result = await context.wa.sendButtonMessage(context.phone, text, buttons);
                console.log('[FLOW] WhatsApp API response:', JSON.stringify(result));
                
                // Save message ID -> node mapping for interactive replies
                const messageId = result?.messages?.[0]?.id;
                if (messageId) {
                    console.log('[FLOW] Saving sent message mapping:', messageId, '->', node.node_id);
                    await query(
                        `INSERT INTO flow_sent_messages (flow_id, phone, node_id, message_id, node_type)
                         VALUES ($1, $2, $3, $4, 'message')
                         ON CONFLICT (message_id) DO NOTHING`,
                        [context.flowId, context.phone, node.node_id, messageId]
                    ).catch(err => console.log('[FLOW] Note: Could not save message mapping:', err.message));
                }
                
                // Check if there are edges from button handles
                // New format: "0", "1", "2"... or legacy "btn_0", "btn_1"...
                const buttonEdges = context.edges.filter(e => 
                    e.source_node_id === node.node_id && 
                    e.source_handle && (
                        /^\d+$/.test(e.source_handle) || // New numeric format
                        e.source_handle.startsWith('btn_') // Legacy format
                    )
                );
                
                if (buttonEdges.length > 0) {
                    console.log('[FLOW] Has', buttonEdges.length, 'button edges, waiting for click');
                    return true; // Wait for button click
                }
                
                return false; // No button edges, continue
                
            } else if (text) {
                console.log('[FLOW] Sending TEXT message');
                const result = await context.wa.sendTextMessage(context.phone, text);
                console.log('[FLOW] WhatsApp API response:', JSON.stringify(result));
                return false; // Continue immediately
            }
        } catch (error) {
            console.error('[FLOW] Failed to send message:', error.message);
            console.error('[FLOW] Error details:', JSON.stringify(error));
        }
        
        return false;
    }
    
    /**
     * Execute list node - returns true if has item edges (waits for selection)
     */
    async executeListNode(context, config, node, sessionId) {
        console.log('[FLOW] ----------------------------------------');
        console.log('[FLOW] Executing LIST node');
        console.log('[FLOW] Node ID:', node.node_id);
        console.log('[FLOW] Config:', JSON.stringify(config));
        
        const title = this.replaceVariables(config.title || 'בחר אופציה', context);
        const body = this.replaceVariables(config.body || '', context);
        const buttonText = config.buttonText || 'בחר';
        const items = config.items || [];
        
        console.log('[FLOW] To:', context.phone);
        console.log('[FLOW] Title:', title);
        console.log('[FLOW] Items:', items.length);
        
        if (items.length === 0) {
            console.log('[FLOW] Skipping empty list');
            return false;
        }
        
        try {
            const result = await context.wa.sendListMessage(context.phone, {
                title,
                body: body || title,
                buttonText,
                sections: [{
                    title: title,
                    rows: items.map((item, index) => ({
                        id: item.id || String(index), // Use simple numeric ID to match handle format
                        title: typeof item === 'string' ? item : (item.title || `פריט ${index + 1}`),
                        description: item.description || ''
                    }))
                }]
            });
            
            console.log('[FLOW] WhatsApp API response:', JSON.stringify(result));
            
            // Save message ID -> node mapping for interactive replies
            const messageId = result?.messages?.[0]?.id;
            if (messageId) {
                console.log('[FLOW] Saving sent message mapping:', messageId, '->', node.node_id);
                await query(
                    `INSERT INTO flow_sent_messages (flow_id, phone, node_id, message_id, node_type)
                     VALUES ($1, $2, $3, $4, 'list')
                     ON CONFLICT (message_id) DO NOTHING`,
                    [context.flowId, context.phone, node.node_id, messageId]
                ).catch(err => console.log('[FLOW] Note: Could not save message mapping:', err.message));
            }
            
            // Check if there are edges from item handles
            // New format: "0", "1", "2"... or legacy "btn_0", "item_0"...
            const itemEdges = context.edges.filter(e => 
                e.source_node_id === node.node_id && 
                e.source_handle && (
                    /^\d+$/.test(e.source_handle) || // New numeric format
                    e.source_handle === 'timeout' || // Timeout handle
                    e.source_handle.startsWith('btn_') || // Legacy format
                    e.source_handle.startsWith('item_') // Legacy format
                )
            );
            
            if (itemEdges.length > 0) {
                console.log('[FLOW] Has', itemEdges.length, 'item edges, waiting for selection');
                return true; // Wait for list selection
            }
            
            return false; // No item edges, continue
            
        } catch (error) {
            console.error('[FLOW] Failed to send list:', error.message);
            return false;
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
                context.variables[config.variable] = this.replaceVariables(config.value || '', context);
                console.log('[FLOW] Set variable:', config.variable, '=', context.variables[config.variable]);
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
                [context.flowId, context.phone, context.messageData?.contactName || '']
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
    
    async endSession(sessionId) {
        try {
            await query(
                `UPDATE flow_sessions SET status = 'completed', updated_at = NOW() WHERE id = $1`,
                [sessionId]
            );
            
            // Also update the execution
            const session = await query('SELECT execution_id FROM flow_sessions WHERE id = $1', [sessionId]);
            if (session.rows[0]?.execution_id) {
                await query(
                    `UPDATE flow_executions SET status = 'completed', completed_at = NOW() WHERE id = $1`,
                    [session.rows[0].execution_id]
                );
            }
            
            console.log('[FLOW] Session ended:', sessionId);
        } catch (error) {
            console.error('[FLOW] Error ending session:', error);
        }
    }
    
    replaceVariables(text, context) {
        if (!text) return '';
        
        return text
            .replace(/{{phone}}/g, context.phone || '')
            .replace(/{{message}}/g, context.message || '')
            .replace(/{{name}}/g, context.messageData?.contactName || '')
            .replace(/{{bot_phone}}/g, context.bot?.phone_number || '')
            .replace(/{{last_selection}}/g, context.variables?.last_selection || '')
            .replace(/\{\{(\w+)\}\}/g, (match, varName) => {
                return context.variables[varName] !== undefined ? context.variables[varName] : match;
            });
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new FlowExecutor();
