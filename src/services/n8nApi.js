const axios = require('axios');

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n2.neriyabudraham.co.il';
const N8N_API_KEY = process.env.N8N_API_KEY;

class N8nApiService {
    constructor() {
        this.client = axios.create({
            baseURL: N8N_BASE_URL,
            headers: {
                'X-N8N-API-KEY': N8N_API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
    }

    async getWorkflows(filters = {}) {
        try {
            let allWorkflows = [];
            let cursor = null;
            let hasMore = true;

            // Fetch all workflows with pagination
            while (hasMore) {
                const params = { limit: 250 };
                if (cursor) params.cursor = cursor;

                const response = await this.client.get('/api/v1/workflows', { params });
                const data = response.data;
                
                const workflows = data.data || data || [];
                allWorkflows = allWorkflows.concat(workflows);

                // Check if there are more pages
                cursor = data.nextCursor;
                hasMore = !!cursor && workflows.length > 0;
            }

            let workflows = allWorkflows;
            
            // Apply filters if provided
            if (filters.nameContains) {
                workflows = workflows.filter(w => 
                    w.name && w.name.includes(filters.nameContains)
                );
            }
            
            if (filters.nameNotContains && Array.isArray(filters.nameNotContains)) {
                for (const exclude of filters.nameNotContains) {
                    workflows = workflows.filter(w => 
                        !w.name || !w.name.includes(exclude)
                    );
                }
            }

            if (filters.active !== undefined) {
                workflows = workflows.filter(w => w.active === filters.active);
            }

            // Sort: "הגרלה" first, then alphabetically
            workflows.sort((a, b) => {
                const aIsHagrala = a.name && a.name.startsWith('הגרלה');
                const bIsHagrala = b.name && b.name.startsWith('הגרלה');
                
                if (aIsHagrala && !bIsHagrala) return -1;
                if (!aIsHagrala && bIsHagrala) return 1;
                return (a.name || '').localeCompare(b.name || '', 'he');
            });

            return workflows.map(w => ({
                id: w.id,
                name: w.name,
                active: w.active,
                createdAt: w.createdAt,
                updatedAt: w.updatedAt
            }));
        } catch (error) {
            console.error('Failed to fetch n8n workflows:', error.message);
            return [];
        }
    }

    async getWorkflow(id) {
        try {
            const response = await this.client.get(`/api/v1/workflows/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch workflow ${id}:`, error.message);
            return null;
        }
    }

    async executeWorkflow(id, data = {}) {
        try {
            const response = await this.client.post(`/api/v1/workflows/${id}/execute`, data);
            return response.data;
        } catch (error) {
            console.error(`Failed to execute workflow ${id}:`, error.message);
            throw error;
        }
    }

    async triggerWebhook(webhookPath, data = {}) {
        try {
            const response = await axios.post(
                `${N8N_BASE_URL}/webhook/${webhookPath}`,
                data,
                { timeout: 30000 }
            );
            return response.data;
        } catch (error) {
            console.error(`Failed to trigger webhook ${webhookPath}:`, error.message);
            throw error;
        }
    }
}

module.exports = new N8nApiService();
