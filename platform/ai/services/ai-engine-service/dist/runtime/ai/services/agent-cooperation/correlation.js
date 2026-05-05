import { logger } from '../../ports/logger.port';
// ============================================
// AGRC-OS — Cross-Agent Correlation
// Discovers patterns across agent findings by
// matching shared entities and severity cascades.
// ============================================
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { detectPatterns } from '../../ports/platform.port';
import { activeCycleContexts } from './cycle-context';
// ── Severity Helper ──────────────────────────────────────────────────────────
export function _maxSeverity(severities) {
    const rank = { critical: 4, high: 3, medium: 2, low: 1 };
    let max = 0;
    for (const s of severities)
        max = Math.max(max, rank[s] || 0);
    if (max >= 4)
        return 'critical';
    if (max >= 3)
        return 'high';
    if (max >= 2)
        return 'medium';
    return 'low';
}
// ── Cross-Agent Correlation ────────────────────────────────────────────────
/**
 * Correlate discoveries from the current agent run against last 24h discoveries from other agents.
 * This enables continuous cross-agent pattern detection after each individual agent run.
 *
 * @param tenantId - Tenant ID
 * @param currentAgentId - The agent that just completed its run
 * @param newDiscoveries - Discoveries from the current agent run (optional, will query DB if not provided)
 * @returns Array of correlations found
 */
export async function correlateDiscoveries(tenantId, currentAgentId, newDiscoveries) {
    const schema = tenantSchema(tenantId);
    const correlations = [];
    try {
        // Get new discoveries from current agent run if not provided
        let currentDiscoveries = newDiscoveries || [];
        // If not provided, try to get from cycle context
        if (currentDiscoveries.length === 0) {
            const ctx = activeCycleContexts.get(tenantId);
            if (ctx) {
                currentDiscoveries = ctx.discoveries.filter(d => !currentAgentId || d.agentId === currentAgentId);
            }
        }
        // If still no discoveries, query from ai_observations or agent_discoveries for last 24h
        if (currentDiscoveries.length === 0 && currentAgentId) {
            const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const obsResult = await safeQuery(`SELECT observation_id as id, agent_id as "agentId", observation_type as type,
                title, severity, entity_type as "entityType", entity_id as "entityId",
                description as details, created_at as timestamp
         FROM "${schema}".ai_observations
         WHERE tenant_id = $1 AND agent_id = $2 AND created_at >= $3
         ORDER BY created_at DESC
         LIMIT 50`, [tenantId, currentAgentId, last24h]);
            currentDiscoveries = obsResult.rows.map((row) => ({
                id: row.id,
                agentId: row.agentId,
                type: row.type,
                severity: row.severity,
                entityType: row.entityType || '',
                entityId: row.entityId || undefined,
                title: row.title,
                details: row.details || '',
                timestamp: row.timestamp,
            }));
        }
        if (currentDiscoveries.length === 0) {
            return []; // No new discoveries to correlate
        }
        // Query last 24h discoveries from OTHER agents (excluding current agent)
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const otherAgentsFilter = currentAgentId ? `AND agent_id != $3` : '';
        const queryParams = currentAgentId
            ? [tenantId, last24h, currentAgentId]
            : [tenantId, last24h];
        // Query from agent_discoveries table (preferred) or ai_observations (fallback)
        const dbDiscoveriesResult = await safeQuery(`SELECT id, agent_id as "agentId", discovery_type as type, title, severity,
              entity_type as "entityType", entity_id as "entityId", details, created_at as timestamp
       FROM "${schema}".agent_discoveries
       WHERE tenant_id = $1 AND created_at >= $2 ${otherAgentsFilter}
       ORDER BY created_at DESC
       LIMIT 200`, queryParams);
        // Also query from ai_observations if agent_discoveries is sparse
        const obsDiscoveriesResult = await safeQuery(`SELECT observation_id as id, agent_id as "agentId", observation_type as type,
              title, severity, entity_type as "entityType", entity_id as "entityId",
              description as details, created_at as timestamp
       FROM "${schema}".ai_observations
       WHERE tenant_id = $1 AND created_at >= $2 ${otherAgentsFilter}
       ORDER BY created_at DESC
       LIMIT 200`, queryParams);
        // Combine and normalize discoveries from both sources
        const otherDiscoveries = [
            ...dbDiscoveriesResult.rows.map((row) => ({
                id: row.id,
                agentId: row.agentId,
                type: (row.type || 'anomaly'),
                severity: (row.severity || 'medium'),
                entityType: row.entityType || '',
                entityId: row.entityId || undefined,
                title: row.title || '',
                details: typeof row.details === 'string' ? row.details : JSON.stringify(row.details || {}),
                timestamp: row.timestamp,
            })),
            ...obsDiscoveriesResult.rows.map((row) => ({
                id: row.id,
                agentId: row.agentId,
                type: (row.type || 'anomaly'),
                severity: (row.severity || 'medium'),
                entityType: row.entityType || '',
                entityId: row.entityId || undefined,
                title: row.title || '',
                details: row.details || '',
                timestamp: row.timestamp,
            })),
        ];
        // Remove duplicates by id
        const uniqueOtherDiscoveries = Array.from(new Map(otherDiscoveries.map(d => [d.id, d])).values());
        if (uniqueOtherDiscoveries.length === 0) {
            return []; // No other agent discoveries to compare against
        }
        // Pattern 1: Same entity flagged by current agent AND other agents
        const entityGroups = new Map();
        // Group current discoveries by entity
        for (const d of currentDiscoveries) {
            if (d.entityId && d.entityType) {
                const key = `${d.entityType}:${d.entityId}`;
                if (!entityGroups.has(key)) {
                    entityGroups.set(key, { current: [], other: [] });
                }
                entityGroups.get(key).current.push(d);
            }
        }
        // Group other discoveries by entity
        for (const d of uniqueOtherDiscoveries) {
            if (d.entityId && d.entityType) {
                const key = `${d.entityType}:${d.entityId}`;
                if (entityGroups.has(key)) {
                    entityGroups.get(key).other.push(d);
                }
            }
        }
        // Find correlations: entities flagged by both current and other agents
        for (const [key, groups] of entityGroups) {
            if (groups.current.length > 0 && groups.other.length > 0) {
                const allDiscoveries = [...groups.current, ...groups.other];
                const agents = [...new Set(allDiscoveries.map(d => d.agentId))];
                if (agents.length >= 2) {
                    const corrId = `corr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
                    const sev = _maxSeverity(allDiscoveries.map(d => d.severity));
                    const correlation = {
                        id: corrId,
                        correlationId: corrId,
                        agents,
                        pattern: `Multi-agent convergence on ${key}`,
                        combinedSeverity: sev,
                        severity: sev,
                        description: `${agents.length} agents independently flagged issues on the same entity: ${allDiscoveries.map(d => `${d.agentId}: ${d.title}`).join('; ')}`,
                        sharedEntity: key,
                        findings: allDiscoveries.map(d => ({ agentId: d.agentId, title: d.title, severity: d.severity, type: d.type })),
                        relatedDiscoveries: allDiscoveries.map(d => `${d.agentId}:${d.title}`),
                    };
                    correlations.push(correlation);
                    // Persist to database
                    try {
                        const corrResult = await safeQuery(`INSERT INTO "${schema}".agent_correlations (id, agents, shared_entity, severity, findings, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 agents = EXCLUDED.agents, shared_entity = EXCLUDED.shared_entity, severity = EXCLUDED.severity,
                 findings = EXCLUDED.findings
               RETURNING id`, [corrId, agents, key, sev, JSON.stringify(correlation.findings)]);
                        if (corrResult.rows.length > 0)
                            logger.info(`[AgentCooperation] Stored correlation ${corrId} for ${key} (${agents.length} agents)`);
                    }
                    catch (err) {
                        logger.warn(`[AgentCooperation] Failed to persist correlation ${corrId}: ${toErrorMessage(err)}`);
                    }
                }
            }
        }
        // Pattern 2: Cascading severity across related domains
        const allRecentDiscoveries = [...currentDiscoveries, ...uniqueOtherDiscoveries];
        const criticals = allRecentDiscoveries.filter(d => d.severity === 'critical');
        const highs = allRecentDiscoveries.filter(d => d.severity === 'high');
        if (criticals.length >= 2 || (criticals.length >= 1 && highs.length >= 3)) {
            const allInvolved = [...criticals, ...highs];
            const involvedAgents = [...new Set(allInvolved.map(d => d.agentId))];
            if (involvedAgents.length >= 2) {
                const cascadeId = `corr-cascade-${Date.now().toString(36)}`;
                const correlation = {
                    id: cascadeId,
                    correlationId: cascadeId,
                    agents: involvedAgents,
                    pattern: 'Severity cascade — multiple domains affected',
                    combinedSeverity: 'critical',
                    severity: 'critical',
                    description: `${criticals.length} critical + ${highs.length} high findings across ${involvedAgents.length} domains suggest systemic issue`,
                    sharedEntity: 'multi-domain',
                    findings: allInvolved.map(d => ({ agentId: d.agentId, title: d.title, severity: d.severity, type: d.type })),
                    relatedDiscoveries: allInvolved.map(d => `${d.agentId}:${d.title}`),
                };
                correlations.push(correlation);
                // Persist to database
                try {
                    const cascadeResult = await safeQuery(`INSERT INTO "${schema}".agent_correlations (id, agents, shared_entity, severity, findings, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (id) DO UPDATE SET
               agents = EXCLUDED.agents, shared_entity = EXCLUDED.shared_entity, severity = EXCLUDED.severity,
               findings = EXCLUDED.findings
             RETURNING id`, [cascadeId, involvedAgents, 'multi-domain', 'critical', JSON.stringify(correlation.findings)]);
                    if (cascadeResult.rows.length > 0)
                        logger.info(`[AgentCooperation] Stored cascade correlation ${cascadeId} (${involvedAgents.length} agents)`);
                }
                catch (err) {
                    logger.warn(`[AgentCooperation] Failed to persist cascade correlation ${cascadeId}: ${toErrorMessage(err)}`);
                }
            }
        }
        // Enhanced Pattern Detection (Requirements: 5.3 Enhanced Cross-Agent Correlation)
        // Use pattern detector service for sophisticated pattern matching
        try {
            const detectedPatterns = await detectPatterns(tenantId, allRecentDiscoveries, 1440); // 24h window
            if (detectedPatterns.length === 0 && allRecentDiscoveries.length > 0) {
                logger.warn('[AgentCooperation] detectPatterns returned empty — stub may be active');
            }
            // Convert pattern matches to correlations
            for (const pattern of detectedPatterns) {
                // Skip if already covered by basic patterns
                const alreadyCovered = correlations.some(c => c.agents.length === pattern.agents.length &&
                    c.agents.every(a => pattern.agents.includes(a)) &&
                    c.sharedEntity === (pattern.metadata.entityKey || 'multi-domain'));
                if (!alreadyCovered && pattern.confidence >= 0.6) {
                    const patternCorrId = `corr-pattern-${pattern.patternId}-${Date.now().toString(36)}`;
                    const correlation = {
                        id: patternCorrId,
                        correlationId: patternCorrId,
                        agents: pattern.agents,
                        pattern: pattern.patternName,
                        combinedSeverity: pattern.severity,
                        severity: pattern.severity,
                        description: pattern.description,
                        sharedEntity: pattern.metadata.entityKey || 'pattern-detected',
                        findings: pattern.matchedDiscoveries.map(d => ({
                            agentId: d.agentId,
                            title: d.title,
                            severity: d.severity,
                            type: d.type
                        })),
                        relatedDiscoveries: pattern.matchedDiscoveries.map(d => `${d.agentId}:${d.title}`),
                    };
                    correlations.push(correlation);
                    // Persist to database
                    try {
                        const patternResult = await safeQuery(`INSERT INTO "${schema}".agent_correlations (id, agents, shared_entity, severity, findings, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 agents = EXCLUDED.agents, shared_entity = EXCLUDED.shared_entity, severity = EXCLUDED.severity,
                 findings = EXCLUDED.findings
               RETURNING id`, [patternCorrId, pattern.agents, correlation.sharedEntity, pattern.severity, JSON.stringify(correlation.findings)]);
                        if (patternResult.rows.length > 0)
                            logger.info(`[AgentCooperation] Stored pattern correlation ${patternCorrId} (${pattern.patternName}, ${pattern.agents.length} agents)`);
                    }
                    catch (err) {
                        logger.warn(`[AgentCooperation] Failed to persist pattern correlation ${patternCorrId}: ${toErrorMessage(err)}`);
                    }
                }
            }
        }
        catch (err) {
            logger.warn(`[AgentCooperation] Pattern detection failed: ${toErrorMessage(err)}`);
            // Continue with basic correlations even if pattern detection fails
        }
        // Update cycle context if active
        const ctx = activeCycleContexts.get(tenantId);
        if (ctx) {
            ctx.correlations.push(...correlations);
        }
        return correlations;
    }
    catch (err) {
        logger.warn(`[AgentCooperation] Failed to correlate discoveries: ${toErrorMessage(err)}`);
        return [];
    }
}
/**
 * Detect temporal correlations — events that happen within a time window.
 * Groups discoveries that occur close together in time from multiple agents.
 * @param discoveries - All discoveries to analyze
 * @param windowMs - Time window in milliseconds (default 5 minutes)
 */
export function detectTemporalCorrelations(discoveries, windowMs = 300000) {
    const patterns = [];
    const sorted = [...discoveries].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    for (let i = 0; i < sorted.length; i++) {
        const window = [sorted[i]];
        for (let j = i + 1; j < sorted.length; j++) {
            if (new Date(sorted[j].timestamp).getTime() - new Date(sorted[i].timestamp).getTime() <= windowMs) {
                window.push(sorted[j]);
            }
            else
                break;
        }
        if (window.length >= 3 && new Set(window.map(d => d.agentId)).size >= 2) {
            patterns.push({
                patternId: `temporal-${Date.now().toString(36)}-${i}`,
                patternType: 'temporal',
                discoveries: window,
                confidence: Math.min(0.95, 0.5 + window.length * 0.1),
                description: `${window.length} discoveries from ${new Set(window.map(d => d.agentId)).size} agents within ${windowMs / 1000}s window`,
            });
        }
    }
    return patterns;
}
/**
 * Detect cascade patterns — risk -> gap -> evidence failure chains.
 * Identifies causal chains where one discovery type triggers another on the same entity.
 */
export function detectCascades(discoveries) {
    const cascadeMap = {
        'risk': ['gap', 'violation'],
        'gap': ['recommendation'],
        'violation': ['risk', 'anomaly'],
        'anomaly': ['risk', 'gap'],
    };
    const patterns = [];
    const byEntity = new Map();
    for (const d of discoveries) {
        if (d.entityId) {
            const key = `${d.entityType}::${d.entityId}`;
            if (!byEntity.has(key))
                byEntity.set(key, []);
            byEntity.get(key).push(d);
        }
    }
    for (const [_key, group] of byEntity) {
        if (group.length < 2)
            continue;
        const types = group.map(d => d.type);
        for (const [trigger, effects] of Object.entries(cascadeMap)) {
            if (types.includes(trigger) && types.some(t => effects.includes(t))) {
                const matchedEffects = effects.filter(e => types.includes(e));
                patterns.push({
                    patternId: `cascade-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
                    patternType: 'cascade',
                    discoveries: group,
                    confidence: 0.75,
                    description: `Cascade detected: ${trigger} -> ${matchedEffects.join(', ')} on ${group[0].entityType}`,
                });
            }
        }
    }
    return patterns;
}
/**
 * Run all correlation analyses and return combined patterns.
 * Combines temporal and cascade detection into a single result set.
 */
export function runFullCorrelation(discoveries) {
    return [
        ...detectTemporalCorrelations(discoveries),
        ...detectCascades(discoveries),
    ];
}
//# sourceMappingURL=correlation.js.map