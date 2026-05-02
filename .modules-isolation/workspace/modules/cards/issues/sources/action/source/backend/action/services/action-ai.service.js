"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTION_AI_CONFIG = void 0;
exports.isActionAiActionAllowed = isActionAiActionAllowed;
exports.isActionAiActionBlocked = isActionAiActionBlocked;
exports.requiresActionHumanApproval = requiresActionHumanApproval;
exports.summarize = summarize;
exports.classify = classify;
exports.recommendActions = recommendActions;
exports.generateReport = generateReport;
exports.ACTION_AI_CONFIG = {
    moduleCode: 'action',
    enabled: true,
    allowedActions: [
        'action.item.draft',
        'action.item.recommend',
        'action.item.summarize',
        'action.item.classify',
        'action.item.score',
        'action.item.analyze',
        'action.item.generate_report',
    ],
    blockedActions: [
        'action.item.delete',
        'action.item.approve',
        'action.item.reject',
        'action.item.override',
        'action.item.bulk_delete',
    ],
    humanInLoopBoundaries: {
        requiresHumanApproval: ['action.item.approve', 'action.item.reject', 'action.item.delete'],
        requiresHumanReview: ['action.item.classify', 'action.item.score'],
        autoExecutable: ['action.item.draft', 'action.item.summarize', 'action.item.analyze'],
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
        systemPromptTemplate: 'action_system_prompt_v1',
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
function isActionAiActionAllowed(action) {
    return exports.ACTION_AI_CONFIG.allowedActions.includes(action);
}
function isActionAiActionBlocked(action) {
    return exports.ACTION_AI_CONFIG.blockedActions.includes(action);
}
function requiresActionHumanApproval(action) {
    return exports.ACTION_AI_CONFIG.humanInLoopBoundaries.requiresHumanApproval.includes(action);
}
const database_port_1 = require("../ports/database.port");
async function summarize(tenantId, entityId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}"."action_items" WHERE action_id = $1`, [entityId]);
    const r = result.rows[0];
    if (!r)
        return { summary: 'Action entity not found.', keyPoints: [], confidence: 0 };
    return {
        summary: `${r.title ?? 'Action Item'}. Status: ${r.status ?? 'N/A'}.`,
        keyPoints: [
            `Status: ${r.status ?? 'N/A'}`,
            `Created: ${r.created_at ?? 'N/A'}`,
            `Title: ${r.title ?? 'N/A'}`,
        ],
        confidence: 0.85,
    };
}
async function classify(tenantId, entityId, _data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}"."action_items" WHERE action_id = $1`, [entityId]);
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
async function recommendActions(tenantId, entityId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}"."action_items" WHERE action_id = $1`, [entityId]);
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
async function generateReport(tenantId, filters) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
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
    const countResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*) as total FROM "${schema}"."action_items" ${where}`, params);
    const statusResult = await (0, database_port_1.safeQuery)(`SELECT status, COUNT(*) as cnt FROM "${schema}"."action_items" ${where} GROUP BY status`, params);
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
//# sourceMappingURL=action-ai.service.js.map