import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { getFirstRow } from '@dos/db';
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';
function normalizeDecisionForApi(record) {
    const outcome = record.outcome || {};
    const inputSummary = record.input_summary || {};
    const signals = Array.isArray(outcome.signals) ? outcome.signals : (Array.isArray(inputSummary.signals) ? inputSummary.signals : []);
    const ruleIds = Array.isArray(outcome.rule_ids) ? outcome.rule_ids : (Array.isArray(outcome.ruleIds) ? outcome.ruleIds : []);
    return {
        ...record,
        signals,
        rule_ids: ruleIds,
        trace_id: record.run_id,
    };
}
export async function recordDecision(input) {
    const schema = tenantSchema(input.tenantId);
    try {
        const result = await safeQuery(`INSERT INTO "${schema}".decision_record
         (tenant_id, run_id, agent_id, decision_type, entity_type, entity_id,
          confidence, explanation, outcome, input_summary, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`, [
            input.tenantId, input.runId || null, input.agentId, input.decisionType,
            input.entityType || null, input.entityId || null,
            input.confidence ?? null, input.explanation || null,
            JSON.stringify(input.outcome), JSON.stringify(input.inputSummary || {}),
            input.createdBy || SYSTEM_JOB_ACTOR,
        ]);
        const row = getFirstRow(result);
        if (row) {
            eventBus.publish({
                eventType: 'ai.decision.recorded', tenantId: input.tenantId,
                sourceService: 'ai-decision-engine', severity: 'info',
                payload: { agentId: input.agentId, decisionId: row.decision_id, decisionType: input.decisionType },
            });
        }
        return row || null;
    }
    catch {
        return null;
    }
}
export async function listDecisions(tenantId, filters) {
    const schema = tenantSchema(tenantId);
    const conditions = ['tenant_id = $1'];
    const params = [tenantId];
    let idx = 2;
    if (filters?.agentId) {
        conditions.push(`agent_id = $${idx++}`);
        params.push(filters.agentId);
    }
    if (filters?.entityType) {
        conditions.push(`entity_type = $${idx++}`);
        params.push(filters.entityType);
    }
    const where = conditions.join(' AND ');
    const limit = Math.min(filters?.limit || 50, 200);
    const offset = filters?.offset || 0;
    const [dataRes, countRes] = await Promise.all([
        safeQuery(`SELECT * FROM "${schema}".decision_record WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]),
        safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".decision_record WHERE ${where}`, params),
    ]);
    const decisions = dataRes.rows.map(normalizeDecisionForApi);
    return { decisions, total: getFirstRow(countRes)?.total || 0 };
}
export async function getDecisionById(tenantId, decisionId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".decision_record WHERE decision_id = $1 AND tenant_id = $2`, [decisionId, tenantId]);
        const row = getFirstRow(result);
        return row ? normalizeDecisionForApi(row) : null;
    }
    catch {
        return null;
    }
}
export async function getRunTrace(tenantId, runId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".decision_record WHERE run_id = $1 AND tenant_id = $2 ORDER BY created_at ASC`, [runId, tenantId]);
        return result.rows.map(normalizeDecisionForApi);
    }
    catch {
        return [];
    }
}
export async function getDecisionTrend(tenantId, days = 7) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT DATE(created_at) AS date, COUNT(*)::int AS count
       FROM "${schema}".decision_record
       WHERE tenant_id = $1 AND created_at > NOW() - ($2 || ' days')::interval
       GROUP BY DATE(created_at) ORDER BY date ASC`, [tenantId, days]);
        return result.rows.map((r) => ({ date: r.date, count: r.count }));
    }
    catch {
        return [];
    }
}
export async function getDecisionStats(tenantId, hours = 24) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT decision_type, agent_id, COUNT(*)::int AS cnt
       FROM "${schema}".decision_record
       WHERE tenant_id = $1 AND created_at > NOW() - ($2 || ' hours')::interval
       GROUP BY decision_type, agent_id`, [tenantId, hours]);
        const byType = {};
        const byAgent = {};
        let total = 0;
        for (const r of result.rows) {
            byType[r.decision_type] = (byType[r.decision_type] || 0) + r.cnt;
            byAgent[r.agent_id] = (byAgent[r.agent_id] || 0) + r.cnt;
            total += r.cnt;
        }
        return { total, byType, byAgent };
    }
    catch {
        return { total: 0, byType: {}, byAgent: {} };
    }
}
export async function getExplainabilityChain(tenantId, decisionId) {
    const decision = await getDecisionById(tenantId, decisionId);
    if (!decision)
        return { decision: null, relatedDecisions: [], signals: [] };
    const schema = tenantSchema(tenantId);
    const [relatedRows, signals] = await Promise.all([
        decision.run_id
            ? safeQuery(`SELECT * FROM "${schema}".decision_record WHERE run_id = $1 AND tenant_id = $2 AND decision_id != $3 ORDER BY created_at ASC`, [decision.run_id, tenantId, decisionId]).then(r => r.rows)
            : Promise.resolve([]),
        safeQuery(`SELECT * FROM "${schema}".cockpit_signal WHERE tenant_id = $1 AND context_json->>'agentId' = $2 AND recorded_at > ($3::timestamptz - INTERVAL '1 hour') AND recorded_at < ($3::timestamptz + INTERVAL '1 hour') ORDER BY recorded_at ASC LIMIT 50`, [tenantId, decision.agent_id, decision.created_at]).then(r => r.rows).catch((err) => { catchHandler(EC.FALLBACK_QUERY, { tenantId, operation: 'query:cockpit_signal' })(err); return []; }),
    ]);
    return { decision, relatedDecisions: relatedRows.map(normalizeDecisionForApi), signals };
}
export async function getDecisionsByEntity(tenantId, entityType, entityId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".decision_record WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3 ORDER BY created_at DESC LIMIT 100`, [tenantId, entityType, entityId]);
        return result.rows;
    }
    catch {
        return [];
    }
}
export async function getDecisionsByEntityForApi(tenantId, entityType, entityId) {
    const rows = await getDecisionsByEntity(tenantId, entityType, entityId);
    return rows.map(normalizeDecisionForApi);
}
//# sourceMappingURL=ai-decision-engine.service.js.map