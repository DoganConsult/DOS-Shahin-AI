import { Request, Response, Router } from 'express';
import { safeQuery } from '@dos/db';

export const providerRouter = Router();

providerRouter.get('/', async (req: Request, res: Response) => {
    try {
        const schema = "public"; // Needs proper request parsing
        const providers = await safeQuery(`SELECT * FROM ${schema}.ai_providers ORDER BY routing_priority ASC`);
        
        // Expose provider state securely, dropping API keys
        const mapped = providers.rows.map(row => ({
            id: row.id,
            provider_name: row.provider_name,
            is_active: row.is_active,
            base_endpoint: row.base_endpoint,
            routing_priority: row.routing_priority,
            configuration_json: row.configuration_json,
            updated_at: row.updated_at
        }));
        
        res.json({ providers: mapped });
    } catch (err: unknown) {
        res.status(500).json({ error: "Failed to list providers" });
    }
});

// S3-007 Agent Invocation Stub for LangChain Execution Gateway
providerRouter.post('/agent/:agentCode/invoke', async (req: Request, res: Response) => {
    try {
        const { agentCode } = req.params;
        const { prompt, threadId } = req.body;
        
        if (!prompt) {
             return res.status(400).json({ error: "Prompt payload is required for invocation" });
        }
        
        // Create execution log
        const schema = "public";
        const execution = await safeQuery(
            `INSERT INTO ${schema}.ai_agent_executions (agent_code, user_id, status, input_payload) 
             VALUES ($1, $2, 'running', $3) RETURNING execution_id`,
            [agentCode, req.headers['x-user-id'] || null, JSON.stringify({ prompt, threadId })]
        );
        
        // This will route to the orchestrator layer (AI-OS) in the monolith or native workers.
        res.json({ 
            execution_id: execution.rows[0].execution_id, 
            status: "accepted", 
            message: "Agent invocation submitted to LangGraph Engine" 
        });
        
    } catch (err: unknown) {
        res.status(500).json({ error: "Execution invocation failed" });
    }
});
