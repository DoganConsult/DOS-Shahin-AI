export const AGRC_ENGINE_AI_CONFIG = {
    moduleCode: 'agrc-engine',
    enabled: true,
    allowedActions: [
        'agrc_engine.health.analyze',
        'agrc_engine.anomaly.detect',
        'agrc_engine.diagnostics.summarize',
        'agrc_engine.run.explain',
        'agrc_engine.config.recommend',
    ],
    blockedActions: [
        'agrc_engine.run.execute',
        'agrc_engine.config.override',
        'agrc_engine.run.cancel',
        'agrc_engine.run.bulk_execute',
    ],
    humanInLoopBoundaries: {
        requiresHumanApproval: ['agrc_engine.config.override', 'agrc_engine.run.execute'],
        requiresHumanReview: ['agrc_engine.health.analyze', 'agrc_engine.anomaly.detect'],
        autoExecutable: ['agrc_engine.diagnostics.summarize', 'agrc_engine.run.explain'],
    },
    modelDependencies: {
        primary: 'azure-openai',
        fallback: 'ollama-llama3',
        embeddingModel: 'text-embedding-3-small',
    },
    promptContracts: {
        maxInputTokens: 8000,
        maxOutputTokens: 4000,
        temperature: 0.2,
        systemPromptTemplate: 'agrc_engine_system_prompt_v1',
    },
    safetyHooks: {
        inputValidation: true,
        outputValidation: true,
        promptInjectionProtection: true,
        piiRedaction: true,
        auditAllInvocations: true,
        maxInvocationsPerHour: 200,
        rateLimitPerTenant: 100,
    },
};
export function isAgrcEngineAiActionAllowed(action) {
    return AGRC_ENGINE_AI_CONFIG.allowedActions.includes(action);
}
export function isAgrcEngineAiActionBlocked(action) {
    return AGRC_ENGINE_AI_CONFIG.blockedActions.includes(action);
}
export function requiresAgrcEngineHumanApproval(action) {
    return AGRC_ENGINE_AI_CONFIG.humanInLoopBoundaries.requiresHumanApproval.includes(action);
}
import { safeQuery, tenantSchema } from '../ports/database.port';
export async function analyzeEngineHealth(tenantId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT status, COUNT(*)::int AS cnt FROM "${schema}".agrc_engine_runs GROUP BY status`).catch(() => ({ rows: [] }));
    const byStatus = {};
    for (const r of rows)
        byStatus[r.status] = r.cnt;
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const failed = byStatus['failed'] ?? 0;
    const healthScore = total > 0 ? Math.round(((total - failed) / total) * 100) : 100;
    const anomalies = [];
    if (failed > total * 0.1)
        anomalies.push(`High failure rate: ${failed}/${total} runs failed.`);
    return { summary: `Engine health: ${healthScore}%. Total runs: ${total}.`, anomalies, healthScore, generatedAt: new Date().toISOString() };
}
export async function explainRun(tenantId, runId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".agrc_engine_runs WHERE run_id = $1`, [runId]).catch(() => ({ rows: [] }));
    const r = rows[0];
    if (!r)
        return { explanation: 'Run not found.', confidence: 0 };
    return {
        explanation: `Run ${r.run_id}: status=${r.status ?? 'unknown'}, started=${r.started_at ?? 'N/A'}, completed=${r.completed_at ?? 'N/A'}.`,
        confidence: 0.85,
    };
}
//# sourceMappingURL=agrc-engine-ai.service.js.map