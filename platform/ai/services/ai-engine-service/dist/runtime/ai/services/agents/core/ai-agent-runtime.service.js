import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { getFirstRow } from '@dos/db';
import { SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';
const agentCircuits = new Map();
const AGENT_CB_FAILURE_THRESHOLD = 3;
const AGENT_CB_RECOVERY_MS = 120_000;
function getCircuit(key) {
    if (!agentCircuits.has(key)) {
        agentCircuits.set(key, { state: 'closed', failures: 0, lastFailureAt: 0, openedAt: 0, probeCount: 0 });
    }
    return agentCircuits.get(key);
}
export function getAgentCircuitState(tenantId, agentId) {
    return { ...getCircuit(`${tenantId}:${agentId}`) };
}
export function checkAgentCircuit(tenantId, agentId) {
    const key = `${tenantId}:${agentId}`;
    const cb = getCircuit(key);
    if (cb.state === 'open') {
        const elapsed = Date.now() - cb.openedAt;
        if (elapsed >= AGENT_CB_RECOVERY_MS) {
            cb.state = 'half_open';
            cb.probeCount = 0;
        }
        else {
            return { allowed: false, reason: `Agent circuit OPEN — ${Math.ceil((AGENT_CB_RECOVERY_MS - elapsed) / 1000)}s until probe`, waitMs: AGENT_CB_RECOVERY_MS - elapsed };
        }
    }
    if (cb.state === 'half_open' && cb.probeCount >= 1) {
        return { allowed: false, reason: 'Agent circuit HALF_OPEN — probe in progress' };
    }
    if (cb.state === 'half_open')
        cb.probeCount++;
    return { allowed: true, reason: 'OK' };
}
export function recordAgentCircuitSuccess(tenantId, agentId) {
    const cb = getCircuit(`${tenantId}:${agentId}`);
    cb.failures = 0;
    cb.state = 'closed';
    cb.probeCount = 0;
}
export function recordAgentCircuitFailure(tenantId, agentId) {
    const cb = getCircuit(`${tenantId}:${agentId}`);
    cb.failures++;
    cb.lastFailureAt = Date.now();
    if (cb.state === 'half_open' || cb.failures >= AGENT_CB_FAILURE_THRESHOLD) {
        cb.state = 'open';
        cb.openedAt = Date.now();
        cb.probeCount = 0;
    }
}
export function resetAgentCircuit(tenantId, agentId) {
    agentCircuits.delete(`${tenantId}:${agentId}`);
}
export async function getAgentRuntimeConfig(tenantId, agentId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".agent_runtime_config WHERE tenant_id = $1 AND agent_id = $2`, [tenantId, agentId]);
        return getFirstRow(result) || null;
    }
    catch {
        return null;
    }
}
export async function isAgentEnabled(tenantId, agentId) {
    const config = await getAgentRuntimeConfig(tenantId, agentId);
    if (config?.enabled === false)
        return false;
    // R1: pause-aware — paused agents are skipped by scheduler but remain enabled
    if (config?.paused_at)
        return false;
    return true;
}
export async function isAgentInCooldown(tenantId, agentId) {
    const config = await getAgentRuntimeConfig(tenantId, agentId);
    const cooldownSec = config?.cooldown_seconds ?? 0;
    if (cooldownSec <= 0)
        return { inCooldown: false, remainingMs: 0 };
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT MAX(completed_at) AS last_completed
       FROM "${schema}".agent_runs
       WHERE tenant_id = $1 AND agent_id = $2 AND status IN ('completed','failed')`, [tenantId, agentId]);
        const lastCompleted = getFirstRow(result)?.last_completed;
        if (!lastCompleted)
            return { inCooldown: false, remainingMs: 0 };
        const elapsedMs = Date.now() - new Date(lastCompleted).getTime();
        const cooldownMs = cooldownSec * 1000;
        if (elapsedMs < cooldownMs) {
            return { inCooldown: true, remainingMs: cooldownMs - elapsedMs };
        }
    }
    catch { }
    return { inCooldown: false, remainingMs: 0 };
}
export async function setAgentEnabled(tenantId, agentId, enabled, updatedBy) {
    const schema = tenantSchema(tenantId);
    try {
        await safeQuery(`INSERT INTO "${schema}".agent_runtime_config (tenant_id, agent_id, enabled, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (tenant_id, agent_id) DO UPDATE SET enabled = $3, updated_by = $4, updated_at = NOW()`, [tenantId, agentId, enabled, updatedBy || SYSTEM_JOB_ACTOR]);
        eventBus.publish({ eventType: enabled ? 'ai.agent.enabled' : 'ai.agent.disabled', tenantId, sourceService: 'ai-agent-runtime', severity: 'info', payload: { agentId, updatedBy } });
        return true;
    }
    catch {
        return false;
    }
}
export async function updateRuntimeConfig(tenantId, agentId, updates, updatedBy) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`INSERT INTO "${schema}".agent_runtime_config
         (tenant_id, agent_id, enabled, max_retries, retry_delay_ms, cooldown_seconds, escalation_on_failure, stuck_threshold_ms, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (tenant_id, agent_id) DO UPDATE SET
         enabled = COALESCE($3, agent_runtime_config.enabled),
         max_retries = COALESCE($4, agent_runtime_config.max_retries),
         retry_delay_ms = COALESCE($5, agent_runtime_config.retry_delay_ms),
         cooldown_seconds = COALESCE($6, agent_runtime_config.cooldown_seconds),
         escalation_on_failure = COALESCE($7, agent_runtime_config.escalation_on_failure),
         stuck_threshold_ms = COALESCE($8, agent_runtime_config.stuck_threshold_ms),
         updated_by = $9, updated_at = NOW()
       RETURNING *`, [
            tenantId, agentId,
            updates.enabled ?? true, updates.maxRetries ?? 3, updates.retryDelayMs ?? 5000,
            updates.cooldownSeconds ?? 0, updates.escalationOnFailure ?? 'notify',
            updates.stuckThresholdMs ?? 300000, updatedBy || SYSTEM_JOB_ACTOR,
        ]);
        return getFirstRow(result) || null;
    }
    catch {
        return null;
    }
}
export async function getRetryPolicy(tenantId, agentId) {
    const config = await getAgentRuntimeConfig(tenantId, agentId);
    return { maxRetries: config?.max_retries ?? 3, retryDelayMs: config?.retry_delay_ms ?? 5000 };
}
export async function retryWithBackoff(fn, opts) {
    let attempt = 0;
    while (true) {
        try {
            const result = await fn();
            recordAgentCircuitSuccess(opts.tenantId, opts.agentId);
            return result;
        }
        catch (err) {
            attempt++;
            recordAgentCircuitFailure(opts.tenantId, opts.agentId);
            if (attempt >= opts.maxRetries)
                throw err;
            const delayMs = opts.baseDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}
export async function detectStuckRuns(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT r.run_id, r.agent_id, r.created_at AS started_at,
              EXTRACT(EPOCH FROM (NOW() - r.created_at)) * 1000 AS duration_ms,
              COALESCE(c.stuck_threshold_ms, 300000) AS threshold_ms
       FROM "${schema}".agent_runs r
       LEFT JOIN "${schema}".agent_runtime_config c ON c.tenant_id = r.tenant_id AND c.agent_id = r.agent_id
       WHERE r.tenant_id = $1 AND r.status = 'running'
         AND EXTRACT(EPOCH FROM (NOW() - r.created_at)) * 1000 > COALESCE(c.stuck_threshold_ms, 300000)`, [tenantId]);
        return result.rows.map((r) => ({
            run_id: r.run_id, agent_id: r.agent_id,
            started_at: r.started_at, duration_ms: Math.round(r.duration_ms),
        }));
    }
    catch {
        return [];
    }
}
export async function cancelStuckRun(tenantId, runId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`UPDATE "${schema}".agent_runs SET status = 'cancelled', completed_at = NOW()
       WHERE run_id = $1 AND tenant_id = $2 AND status = 'running' RETURNING run_id`, [runId, tenantId]);
        return (result.rows?.length || 0) > 0;
    }
    catch {
        return false;
    }
}
export async function escalateFailedRun(tenantId, runId, agentId) {
    const config = await getAgentRuntimeConfig(tenantId, agentId);
    const escalation = config?.escalation_on_failure || 'notify';
    eventBus.publish({ eventType: 'ai.run.escalated', tenantId, sourceService: 'ai-agent-runtime', severity: 'warning', payload: { runId, agentId, escalationType: escalation } });
    if (escalation === 'disable') {
        await setAgentEnabled(tenantId, agentId, false, 'system:escalation');
    }
}
export async function getAgentRunStats(tenantId, agentId, hours = 24) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'completed') AS succeeded,
         COUNT(*) FILTER (WHERE status = 'failed') AS failed,
         AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - created_at)) * 1000) AS avg_ms,
         MAX(created_at) AS last_run
       FROM "${schema}".agent_runs
       WHERE tenant_id = $1 AND agent_id = $2 AND created_at > NOW() - ($3 || ' hours')::interval`, [tenantId, agentId, hours]);
        const r = getFirstRow(result);
        return {
            totalRuns: parseInt(r?.total || '0'),
            succeeded: parseInt(r?.succeeded || '0'),
            failed: parseInt(r?.failed || '0'),
            avgDurationMs: Math.round(parseFloat(r?.avg_ms || '0')),
            lastRunAt: r?.last_run || null,
        };
    }
    catch {
        return { totalRuns: 0, succeeded: 0, failed: 0, avgDurationMs: 0, lastRunAt: null };
    }
}
export async function listAllRuntimeConfigs(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".agent_runtime_config WHERE tenant_id = $1 ORDER BY agent_id`, [tenantId]);
        return result.rows;
    }
    catch {
        return [];
    }
}
export async function setAgentDisableReason(tenantId, agentId, reason, disabledBy) {
    const schema = tenantSchema(tenantId);
    try {
        await safeQuery(`INSERT INTO "${schema}".agent_runtime_config (tenant_id, agent_id, enabled, updated_by, updated_at)
       VALUES ($1, $2, FALSE, $3, NOW())
       ON CONFLICT (tenant_id, agent_id) DO UPDATE SET enabled = FALSE, escalation_on_failure = $4, updated_by = $3, updated_at = NOW()`, [tenantId, agentId, disabledBy, `disabled:${reason}`]);
        eventBus.publish({ eventType: 'ai.agent.disabled', tenantId, sourceService: 'ai-agent-runtime', severity: 'warning', payload: { agentId, reason, disabledBy } });
        return true;
    }
    catch {
        return false;
    }
}
export async function getRuntimeHealthSummary(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const [configRes, runsRes, stuckRes] = await Promise.all([
            safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE enabled = TRUE)::int AS enabled_count, COUNT(*) FILTER (WHERE enabled = FALSE)::int AS disabled_count FROM "${schema}".agent_runtime_config WHERE tenant_id = $1`, [tenantId]),
            safeQuery(`SELECT COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count, AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - created_at)) * 1000) AS avg_ms FROM "${schema}".agent_runs WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`, [tenantId]),
            safeQuery(`SELECT COUNT(*)::int AS stuck FROM "${schema}".agent_runs r LEFT JOIN "${schema}".agent_runtime_config c ON c.tenant_id = r.tenant_id AND c.agent_id = r.agent_id WHERE r.tenant_id = $1 AND r.status = 'running' AND EXTRACT(EPOCH FROM (NOW() - r.created_at)) * 1000 > COALESCE(c.stuck_threshold_ms, 300000)`, [tenantId]),
        ]);
        let circuitOpenCount = 0;
        for (const [, state] of agentCircuits) {
            if (state.state === 'open')
                circuitOpenCount++;
        }
        const cr = getFirstRow(configRes);
        const rr = getFirstRow(runsRes);
        const sr = getFirstRow(stuckRes);
        return {
            totalAgents: cr?.total || 0,
            enabledAgents: cr?.enabled_count || 0,
            disabledAgents: cr?.disabled_count || 0,
            circuitOpenCount,
            stuckRunCount: sr?.stuck || 0,
            failedRunsLast24h: rr?.failed_count || 0,
            avgDurationMsLast24h: Math.round(parseFloat(rr?.avg_ms || '0')),
        };
    }
    catch {
        return { totalAgents: 0, enabledAgents: 0, disabledAgents: 0, circuitOpenCount: 0, stuckRunCount: 0, failedRunsLast24h: 0, avgDurationMsLast24h: 0 };
    }
}
export async function validateRuntimeConfigIntegrity(tenantId) {
    const configs = await listAllRuntimeConfigs(tenantId);
    const issues = [];
    for (const c of configs) {
        if (c.max_retries < 0 || c.max_retries > 20)
            issues.push(`${c.agent_id}: max_retries out of range (0-20)`);
        if (c.retry_delay_ms < 100 || c.retry_delay_ms > 60000)
            issues.push(`${c.agent_id}: retry_delay_ms out of range (100-60000)`);
        if (c.cooldown_seconds < 0 || c.cooldown_seconds > 86400)
            issues.push(`${c.agent_id}: cooldown_seconds out of range (0-86400)`);
        if (c.stuck_threshold_ms < 10000 || c.stuck_threshold_ms > 3600000)
            issues.push(`${c.agent_id}: stuck_threshold_ms out of range (10s-1h)`);
        if (!['notify', 'disable', 'log'].includes(c.escalation_on_failure) && !c.escalation_on_failure?.startsWith('disabled:')) {
            issues.push(`${c.agent_id}: any escalation_on_failure: ${c.escalation_on_failure}`);
        }
    }
    return { valid: issues.length === 0, issues };
}
//# sourceMappingURL=ai-agent-runtime.service.js.map