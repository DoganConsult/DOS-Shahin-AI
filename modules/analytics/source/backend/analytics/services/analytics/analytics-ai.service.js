"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANALYTICS_AI_CONFIG = void 0;
exports.isAnalyticsAiActionAllowed = isAnalyticsAiActionAllowed;
exports.isAnalyticsAiActionBlocked = isAnalyticsAiActionBlocked;
exports.requiresAnalyticsHumanApproval = requiresAnalyticsHumanApproval;
exports.summarize = summarize;
exports.classify = classify;
exports.recommendActions = recommendActions;
exports.generateReport = generateReport;
exports.ANALYTICS_AI_CONFIG = {
    moduleCode: 'analytics',
    enabled: true,
    allowedActions: [
        'analytics.report.draft',
        'analytics.report.recommend',
        'analytics.report.summarize',
        'analytics.report.classify',
        'analytics.report.score',
        'analytics.report.analyze',
        'analytics.report.generate_report',
    ],
    blockedActions: [
        'analytics.report.delete',
        'analytics.report.approve',
        'analytics.report.reject',
        'analytics.report.override',
        'analytics.report.bulk_delete',
    ],
    humanInLoopBoundaries: {
        requiresHumanApproval: ['analytics.report.approve', 'analytics.report.reject', 'analytics.report.delete'],
        requiresHumanReview: ['analytics.report.classify', 'analytics.report.score'],
        autoExecutable: ['analytics.report.draft', 'analytics.report.summarize', 'analytics.report.analyze'],
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
        systemPromptTemplate: 'analytics_system_prompt_v1',
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
function isAnalyticsAiActionAllowed(action) {
    return exports.ANALYTICS_AI_CONFIG.allowedActions.includes(action);
}
function isAnalyticsAiActionBlocked(action) {
    return exports.ANALYTICS_AI_CONFIG.blockedActions.includes(action);
}
function requiresAnalyticsHumanApproval(action) {
    return exports.ANALYTICS_AI_CONFIG.humanInLoopBoundaries.requiresHumanApproval.includes(action);
}
const database_port_1 = require("../../ports/database.port");
async function summarize(tenantId, entityId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".analytics_reports WHERE id = $1`, [entityId]);
    const r = result.rows[0];
    if (!r)
        return { summary: 'Analytics entity not found.', keyPoints: [], confidence: 0 };
    return {
        summary: `\${r.title ?? "Analytics"} report (\${r.report_type ?? "dashboard"}). Status: \${r.status ?? "N/A"}.`,
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
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".analytics_reports WHERE id = $1`, [entityId]);
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
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".analytics_reports WHERE id = $1`, [entityId]);
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
    const countResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*) as total FROM "${schema}".analytics_reports ${where}`, params);
    const statusResult = await (0, database_port_1.safeQuery)(`SELECT status, COUNT(*) as cnt FROM "${schema}".analytics_reports ${where} GROUP BY status`, params);
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
//# sourceMappingURL=analytics-ai.service.js.map