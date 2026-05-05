export const AI_AI_CONFIG = {
    moduleCode: 'ai',
    enabled: true,
    allowedActions: [
        'ai.agent.draft',
        'ai.agent.recommend',
        'ai.agent.summarize',
        'ai.agent.classify',
        'ai.agent.score',
        'ai.agent.analyze',
        'ai.agent.generate_report',
    ],
    blockedActions: [
        'ai.agent.delete',
        'ai.agent.approve',
        'ai.agent.reject',
        'ai.agent.override',
        'ai.agent.bulk_delete',
    ],
    humanInLoopBoundaries: {
        requiresHumanApproval: ['ai.agent.approve', 'ai.agent.reject', 'ai.agent.delete'],
        requiresHumanReview: ['ai.agent.classify', 'ai.agent.score'],
        autoExecutable: ['ai.agent.draft', 'ai.agent.summarize', 'ai.agent.analyze'],
    },
    modelDependencies: {
        primary: 'azure-openai',
        fallback: 'ollama-llama3',
        embeddingModel: 'text-embedding-3-small',
    },
    promptContracts: {
        maxInputTokens: 8000,
        maxOutputTokens: 4000,
        temperature: 0.3,
        systemPromptTemplate: 'ai_system_prompt_v1',
    },
    safetyHooks: {
        inputValidation: true,
        outputValidation: true,
        promptInjectionProtection: true,
        piiRedaction: true,
        auditAllInvocations: true,
        maxInvocationsPerHour: 100,
        rateLimitPerTenant: 50,
    },
};
export function isAiAiActionAllowed(action) {
    return AI_AI_CONFIG.allowedActions.includes(action);
}
export function isAiAiActionBlocked(action) {
    return AI_AI_CONFIG.blockedActions.includes(action);
}
export function requiresAiHumanApproval(action) {
    return AI_AI_CONFIG.humanInLoopBoundaries.requiresHumanApproval.includes(action);
}
import { safeQuery, tenantSchema } from '../../ports/database.port';
export async function summarize(tenantId, entityId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_invocations WHERE id = $1`, [entityId]);
    const r = result.rows[0];
    if (!r)
        return { summary: 'AI entity not found.', keyPoints: [], confidence: 0 };
    return {
        summary: `\${r.title ?? "AI Agent"} invocation. Status: \${r.status ?? "N/A"}.`,
        keyPoints: [
            `Status: ${r.status ?? 'N/A'}`,
            `Created: ${r.created_at ?? 'N/A'}`,
            `Title: ${r.title ?? 'N/A'}`,
        ],
        confidence: 0.85,
    };
}
export async function classify(tenantId, entityId, _data) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_invocations WHERE id = $1`, [entityId]);
    const r = result.rows[0];
    if (!r)
        return { category: 'unknown', confidence: 0, reasoning: 'Entity not found' };
    const status = r.status ?? 'unknown';
    return {
        category: status,
        confidence: 0.8,
        reasoning: `Classified based on current status (${status}) and entity attributes.`,
    };
}
export async function recommendActions(tenantId, entityId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_invocations WHERE id = $1`, [entityId]);
    const r = result.rows[0];
    const recommendations = [];
    if (!r)
        return { recommendations, generatedAt: new Date().toISOString() };
    if (!r.assigned_to && !r.owner) {
        recommendations.push({ action: 'Assign an owner', priority: 'high', reasoning: 'No owner assigned to this entity.' });
    }
    if (r.status === 'draft') {
        recommendations.push({ action: 'Move to next lifecycle stage', priority: 'medium', reasoning: 'Entity is still in draft status.' });
    }
    if (r.due_date && new Date(r.due_date) < new Date()) {
        recommendations.push({ action: 'Address overdue deadline', priority: 'critical', reasoning: 'The due date has passed.' });
    }
    return { recommendations, generatedAt: new Date().toISOString() };
}
export async function generateReport(tenantId, filters) {
    const schema = tenantSchema(tenantId);
    const conditions = [];
    const params = [];
    let idx = 1;
    if (filters?.status) {
        conditions.push(`status = $${idx++}`);
        params.push(filters.status);
    }
    if (filters?.dateFrom) {
        conditions.push(`created_at >= $${idx++}`);
        params.push(filters.dateFrom);
    }
    if (filters?.dateTo) {
        conditions.push(`created_at <= $${idx++}`);
        params.push(filters.dateTo);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await safeQuery(`SELECT COUNT(*) as total FROM "${schema}".ai_invocations ${where}`, params);
    const statusResult = await safeQuery(`SELECT status, COUNT(*) as cnt FROM "${schema}".ai_invocations ${where} GROUP BY status`, params);
    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);
    const byStatus = {};
    for (const row of statusResult.rows) {
        byStatus[row.status] = parseInt(row.cnt, 10);
    }
    const insights = [];
    if (total === 0)
        insights.push('No records found matching the criteria.');
    else
        insights.push(`Total records: ${total}.`);
    const draftCount = byStatus['draft'] ?? 0;
    if (draftCount > total * 0.3)
        insights.push(`High number of drafts (${draftCount}/${total}). Consider reviewing stale items.`);
    return { totalCount: total, byStatus, insights, generatedAt: new Date().toISOString() };
}
//# sourceMappingURL=ai-ai.service.js.map