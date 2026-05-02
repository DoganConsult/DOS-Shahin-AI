import { logger } from '../../ports/logger.port.js';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';
// ============================================
// AGRC-OS — Multi-Agent Conflict Detection
// Detects contradictory outcomes, severity
// disagreements, and action conflicts between
// agents operating on the same entity.
// ============================================
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { eventBus } from '../../ports/events.port.js';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { activeCycleContexts } from './cycle-context.js';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port.js';
// ── Multi-Agent Conflict Detection (Feature 17) ─────────────────────────────
/**
 * Detect conflicts: same entity flagged by 2+ agents with contradictory outcomes
 * (e.g. A07 "accept risk" vs A06 "control failing").
 */
/**
 * Legacy conflict detection (kept for backward compatibility)
 * Use detectConflictsAdvanced from conflict-resolver.service.ts for enhanced detection
 */
export function detectConflicts(tenantId) {
    const ctx = activeCycleContexts.get(tenantId);
    if (!ctx || ctx.discoveries.length < 2)
        return [];
    const entityGroups = new Map();
    for (const d of ctx.discoveries) {
        if (d.entityId && d.entityType) {
            const key = `${d.entityType}:${d.entityId}`;
            if (!entityGroups.has(key))
                entityGroups.set(key, []);
            entityGroups.get(key).push(d);
        }
    }
    const conflicts = [];
    for (const [key, group] of entityGroups) {
        if (group.length < 2)
            continue;
        const agents = [...new Set(group.map(d => d.agentId))];
        if (agents.length < 2)
            continue;
        const [entityType, entityId] = key.includes(':') ? key.split(/:(.*)/).filter(Boolean) : [key, ''];
        const severities = group.map(d => d.severity);
        const types = group.map(d => d.type);
        // Contradictory outcome: e.g. risk (accept/mitigate) vs gap/violation (remediate)
        const hasRiskOrRecommendation = types.some(t => t === 'risk' || t === 'recommendation');
        const hasGapOrViolation = types.some(t => t === 'gap' || t === 'violation');
        const hasCriticalOrHigh = severities.some(s => s === 'critical' || s === 'high');
        const hasLow = severities.some(s => s === 'low');
        if (hasRiskOrRecommendation && hasGapOrViolation) {
            conflicts.push({
                entityType,
                entityId: entityId || undefined,
                conflictType: 'contradictory_outcome',
                proposals: group.map(d => ({ agentId: d.agentId, discovery: d })),
            });
        }
        else if (hasCriticalOrHigh && hasLow) {
            conflicts.push({
                entityType,
                entityId: entityId || undefined,
                conflictType: 'severity_disagreement',
                proposals: group.map(d => ({ agentId: d.agentId, discovery: d })),
            });
        }
    }
    return conflicts;
}
/**
 * Persist conflicts, create HITL tasks, and publish ai.hitl.requested.
 */
export async function recordAgentConflicts(tenantId, cycleId, candidates) {
    if (candidates.length === 0)
        return;
    const schema = tenantSchema(tenantId);
    const { queuePendingAction } = await import('@dos/platform-core/settings/platform-mode-gate');
    for (const c of candidates) {
        try {
            const proposalsJson = c.proposals.map(p => ({
                agentId: p.agentId,
                type: p.discovery.type,
                severity: p.discovery.severity,
                title: p.discovery.title,
                details: p.discovery.details,
                entityType: p.discovery.entityType,
                entityId: p.discovery.entityId,
            }));
            const r = await safeQuery(`INSERT INTO "${schema}".agent_conflicts
         (tenant_id, cycle_id, entity_type, entity_id, proposals, conflict_type, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'open')
         RETURNING conflict_id`, [tenantId, cycleId || null, c.entityType, c.entityId || null, JSON.stringify(proposalsJson), c.conflictType]);
            const conflictId = getFirstRow(r)?.conflict_id;
            if (conflictId) {
                await queuePendingAction(tenantId, SYSTEM_JOB_ACTOR, {
                    type: 'conflict_resolution',
                    title: `Multi-agent conflict: ${c.entityType}/${c.entityId ?? 'n/a'}`,
                    description: `${c.conflictType}: ${c.proposals.map(p => `${p.agentId}: ${p.discovery.title}`).join(' vs ')}`,
                    priority: 'high',
                    entityType: c.entityType,
                    entityId: c.entityId,
                    payload: { conflictId, conflictType: c.conflictType, proposals: proposalsJson },
                });
                eventBus.publish({
                    eventType: 'ai.hitl.requested',
                    tenantId,
                    severity: 'warning',
                    payload: { conflictId, entityType: c.entityType, entityId: c.entityId, conflictType: c.conflictType, proposals: proposalsJson },
                });
            }
        }
        catch (err) {
            logger.warn(`[AgentCooperation] Failed to record conflict for ${c.entityType}/${c.entityId}: ${toErrorMessage(err)}`);
        }
    }
}
/**
 * Check if there is an open conflict for the given entity (blocks auto-execution).
 */
export async function hasOpenConflict(tenantId, entityType, entityId) {
    const schema = tenantSchema(tenantId);
    const r = await safeQuery(`SELECT 1 FROM "${schema}".agent_conflicts
     WHERE tenant_id = $1 AND entity_type = $2 AND (entity_id IS NOT DISTINCT FROM $3) AND status = 'open'
     LIMIT 1`, [tenantId, entityType, entityId ?? null]);
    return (r.rows?.length ?? 0) > 0;
}
/**
 * Detect conflicts between discoveries from different agents.
 * Two discoveries conflict if they:
 * 1. Target the same entity (entityType + entityId match)
 * 2. Propose contradictory actions (e.g., one says "close risk", other says "escalate risk")
 * 3. Are duplicates (same entity, same type, similar details)
 */
export function detectDiscoveryConflicts(discoveries) {
    const conflicts = [];
    const byEntity = new Map();
    // Group discoveries by entity
    for (const d of discoveries) {
        if (d.entityId) {
            const key = `${d.entityType}::${d.entityId}`;
            if (!byEntity.has(key))
                byEntity.set(key, []);
            byEntity.get(key).push(d);
        }
    }
    // Check each entity group for conflicts
    for (const [_key, group] of byEntity) {
        if (group.length < 2)
            continue;
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const a = group[i], b = group[j];
                if (a.agentId === b.agentId)
                    continue; // same agent, no conflict
                const conflictType = classifyConflict(a, b);
                if (conflictType) {
                    conflicts.push({
                        conflictId: `conflict-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                        discoveryA: a,
                        discoveryB: b,
                        conflictType,
                        resolution: 'pending',
                    });
                }
            }
        }
    }
    return conflicts;
}
/**
 * Classify the type of conflict between two discoveries on the same entity.
 */
function classifyConflict(a, b) {
    // Duplicate: same type and similar details
    if (a.type === b.type && similarText(a.details || a.title, b.details || b.title)) {
        return 'duplicate_finding';
    }
    // Contradictory: opposing severities on same entity
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    if (a.type === b.type && Math.abs((severityOrder[a.severity] || 0) - (severityOrder[b.severity] || 0)) >= 2) {
        return 'contradictory_action';
    }
    // Scope overlap: different agents working on overlapping domains
    if (a.type !== b.type && a.entityType === b.entityType) {
        return 'scope_overlap';
    }
    return null;
}
/**
 * Check if two text strings are similar based on word overlap ratio.
 * Returns true if more than 60% of words are shared.
 */
function similarText(a, b) {
    if (!a || !b)
        return false;
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    let overlap = 0;
    for (const w of wordsA)
        if (wordsB.has(w))
            overlap++;
    return overlap / Math.max(wordsA.size, wordsB.size) > 0.6;
}
/**
 * Auto-resolve conflicts where possible.
 * - Duplicates: keep the one with higher severity
 * - Contradictory: escalate to human
 * - Scope overlap: auto-resolve (merge findings)
 */
export function resolveConflicts(conflicts) {
    return conflicts.map(c => {
        if (c.conflictType === 'duplicate_finding') {
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            const keepA = (severityOrder[c.discoveryA.severity] || 0) >= (severityOrder[c.discoveryB.severity] || 0);
            return { ...c, resolution: 'auto_resolved', resolvedBy: keepA ? c.discoveryA.agentId : c.discoveryB.agentId };
        }
        if (c.conflictType === 'contradictory_action') {
            return { ...c, resolution: 'escalated' };
        }
        return { ...c, resolution: 'auto_resolved' };
    });
}
/**
 * Persist conflict records to the database for audit trail.
 * Uses agrc_event_log to avoid requiring a dedicated conflicts table for these records.
 */
export async function persistConflictRecords(tenantId, conflicts) {
    if (conflicts.length === 0)
        return;
    const s = tenantSchema(tenantId);
    for (const c of conflicts) {
        swallow(EC.AGENT_ACTION, safeQuery(`INSERT INTO "${s}".agrc_event_log (event_type, entity_type, entity_id, payload, created_at)
       VALUES ('agent_conflict', 'conflict', $1, $2::jsonb, NOW())
       ON CONFLICT DO NOTHING`, [c.conflictId, JSON.stringify(c)]), { tenantId, operation: 'persistConflictRecord' });
    }
}
//# sourceMappingURL=conflict-detection.js.map