// ============================================
// AGRC-OS — Inter-Agent Finding Sharing
// Cooperation chains, finding sharing, evidence
// requests, and cooperation audit log queries.
// ============================================
import { safeQuery, tenantSchema } from '../../ports/database.port';
// ── Cooperation Chains ──────────────────────────────────────────────────────
// Defines which agents can cooperate and the expected data flow direction.
export const COOPERATION_CHAINS = {
    'A02': ['A03'], // Risk Analyzer -> Evidence Collector (risk needs proof)
    'A01': ['A05'], // Compliance Monitor -> Audit Planner (compliance gaps -> audit scope)
    'A04': ['A06'], // Policy Manager -> Vendor Risk (policy controls -> vendor assessment)
};
// ── Inter-Agent Finding Sharing ─────────────────────────────────────────────
/**
 * Share findings from one agent with another.
 * Validates the cooperation chain and persists to agrc_event_log
 * for cross-process visibility and audit trail.
 */
export async function shareFindings(tenantId, fromAgentId, toAgentId, findings) {
    throw new Error("Not implemented: Stubbed during microservice extraction");
}
/**
 * A02 (Risk Analyzer) asks A03 (Evidence Collector) to fetch evidence
 * for a specific control. Creates a handoff + logs the cooperation event.
 */
export async function requestEvidence(tenantId, fromAgentId, controlId) {
    throw new Error("Not implemented: Stubbed during microservice extraction");
}
/**
 * Get all findings that have been shared with a specific agent.
 * Queries the agrc_event_log for agent.cooperation events
 * where the target agent matches.
 */
export async function getSharedFindings(tenantId, agentId) {
    if (!tenantId || !agentId) {
        return [];
    }
    const schema = tenantSchema(tenantId);
    // Query agrc_event_log for cooperation events targeting this agent
    const result = await safeQuery(`SELECT payload, created_at
     FROM "${schema}".agrc_event_log
     WHERE event_type = 'agent.cooperation'
       AND tenant_id = $1
       AND (payload->>'toAgentId') = $2
       AND (payload->>'cooperationType') = 'share_findings'
     ORDER BY created_at DESC
     LIMIT 200`, [tenantId, agentId]);
    return result.rows.map((row) => {
        const p = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
        return {
            id: p.findingId || '',
            fromAgentId: p.fromAgentId || '',
            toAgentId: p.toAgentId || agentId,
            tenantId,
            finding: p.finding || {},
            sharedAt: p.sharedAt || row.created_at,
            acknowledged: false,
        };
    });
}
/**
 * Get the full cooperation audit trail for a tenant.
 * Returns all inter-agent cooperation events in chronological order.
 */
export async function getCooperationLog(tenantId, limit = 100) {
    if (!tenantId)
        return [];
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT id, event_type, source_service, payload, created_at
     FROM "${schema}".agrc_event_log
     WHERE event_type = 'agent.cooperation'
       AND tenant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`, [tenantId, limit]);
    return result.rows.map((row) => {
        const p = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
        return {
            id: row.id?.toString() || '',
            eventType: row.event_type,
            cooperationType: p.cooperationType || 'any',
            fromAgentId: p.fromAgentId || '',
            toAgentId: p.toAgentId || '',
            payload: p,
            createdAt: row.created_at,
        };
    });
}
// ── Finding Aggregation (Pillar 2: Agent Cooperation) ─────────────────────────
/**
 * Aggregate confidence when multiple agents report the same finding.
 * If 3+ agents flag the same risk, boost severity by one level.
 */
export function aggregateFindings(discoveries) {
    const byEntity = new Map();
    for (const d of discoveries) {
        if (d.entityId) {
            const key = `${d.entityType}::${d.entityId}::${d.type}`;
            if (!byEntity.has(key))
                byEntity.set(key, []);
            byEntity.get(key).push(d);
        }
    }
    const aggregated = [];
    for (const [_key, group] of byEntity) {
        if (group.length === 1) {
            aggregated.push(group[0]);
            continue;
        }
        // Multiple agents agree — boost severity if 3+ corroborate
        const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        const reverseSeverity = { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical' };
        const maxSeverity = Math.max(...group.map(d => severityOrder[d.severity] || 1));
        const boostedSeverity = Math.min(4, maxSeverity + (group.length >= 3 ? 1 : 0));
        const merged = {
            ...group[0],
            severity: (reverseSeverity[boostedSeverity] || 'medium'),
            details: `[Corroborated by ${group.length} agents: ${group.map(d => d.agentId).join(', ')}] ${group[0].details}`,
        };
        aggregated.push(merged);
    }
    return aggregated;
}
/**
 * Persist shared findings to DB for cross-cycle learning.
 * Returns count of successfully persisted findings.
 */
export async function persistSharedFindings(tenantId, findings) {
    const s = tenantSchema(tenantId);
    let persisted = 0;
    for (const f of findings) {
        try {
            await safeQuery(`INSERT INTO "${s}".agrc_event_log (event_type, entity_type, entity_id, payload, created_at)
         VALUES ('shared_finding', $1, $2, $3::jsonb, NOW())`, [f.entityType || 'any', f.entityId || f.id, JSON.stringify(f)]);
            persisted++;
        }
        catch { /* non-critical */ }
    }
    return persisted;
}
//# sourceMappingURL=finding-sharing.js.map