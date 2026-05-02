"use strict";
/**
 * AI OS Kernel Service — R0 Production
 *
 * Backed by real tenant schema tables:
 *   agent_runs            — process table, status, latency
 *   agent_runtime_config  — agent enable/disable
 *   agent_handoffs        — IPC message bus
 *   agent_memories        — memory partitions
 *   governance_signals    — signal log
 *   job_registry (public) — real scheduler cron/state
 *
 * Column references verified against:
 *   migrations/tenant/107_agent_orchestration_v1.sql
 *   migrations/tenant/350_ai_os_closure_tables.sql
 *   job-scheduler.service.ts (job_registry DDL)
 *
 * R1 columns (migration 700): agent_runs.tokens_used, agent_runs.parent_run_id — both live.
 * Circuit state: persisted in agent_circuit_breaker table; blocked count derived via JOIN.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProcessTable = getProcessTable;
exports.getKernelStatus = getKernelStatus;
exports.getSchedulerTable = getSchedulerTable;
exports.getIpcMessages = getIpcMessages;
exports.getMemoryPartitions = getMemoryPartitions;
exports.getKernelLog = getKernelLog;
exports.killProcess = killProcess;
exports.rebootAgent = rebootAgent;
exports.adjustAutonomyLevel = adjustAutonomyLevel;
exports.injectPriority = injectPriority;
exports.killRunningAction = killRunningAction;
exports.getTokenUsage = getTokenUsage;
exports.setGlobalAutonomyLevel = setGlobalAutonomyLevel;
exports.getPriorityDirective = getPriorityDirective;
exports.clearPriorityDirective = clearPriorityDirective;
exports.getProcessDetail = getProcessDetail;
exports.getAgentDetail = getAgentDetail;
exports.pauseAgent = pauseAgent;
exports.resumeAgent = resumeAgent;
exports.getKernelHealth = getKernelHealth;
exports.saveKernelSnapshot = saveKernelSnapshot;
exports.listKernelSnapshots = listKernelSnapshots;
const db_1 = require("@dos/db");
const observability_1 = require("../observability");
const resilience_1 = require("../resilience/resilience");
// ── Process Table (/proc) ───────────────────────────────────────────────────
// Columns from agent_runs (migration 107): run_id, agent_id, status, platform_mode,
// created_at, updated_at, duration_ms. Status enum: running|awaiting_approval|completed|failed|cancelled
async function getProcessTable(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        const result = await (0, db_1.safeQuery)(`
      SELECT
        run_id AS pid,
        agent_id,
        status AS state,
        COALESCE(platform_mode, 'hybrid') AS priority,
        created_at AS started_at,
        CASE WHEN status IN ('completed','failed','cancelled')
             THEN updated_at ELSE NULL END AS completed_at,
        COALESCE(duration_ms, 0) AS duration_ms,
        COALESCE(tokens_used, 0) AS memory_used,
        parent_run_id AS parent_pid,
        CASE
          WHEN status = 'completed' THEN 0
          WHEN status = 'failed' THEN 1
          WHEN status = 'cancelled' THEN 3
          ELSE NULL
        END AS exit_code
      FROM "${schema}".agent_runs
      WHERE created_at > NOW() - INTERVAL '24 hours'
      ORDER BY
        CASE status
          WHEN 'running' THEN 0
          WHEN 'awaiting_approval' THEN 1
          ELSE 3
        END,
        created_at DESC
      LIMIT 200
    `);
        return result.rows.map((r) => ({
            pid: String(r.pid),
            agentId: String(r.agent_id),
            state: mapRunStatus(String(r.state || '')),
            priority: mapPriority(String(r.priority || '')),
            startedAt: toISOOrNull(r.started_at),
            completedAt: toISOOrNull(r.completed_at),
            durationMs: Number(r.duration_ms) || null,
            memoryUsed: Number(r.memory_used) || 0,
            cpuTime: Number(r.duration_ms) || 0,
            parentPid: r.parent_pid ? String(r.parent_pid) : null,
            exitCode: r.exit_code != null ? Number(r.exit_code) : null,
        }));
    }
    catch (err) {
        observability_1.logger.warn('[Kernel] getProcessTable failed', { error: (0, db_1.toErrorMessage)(err) });
        return [];
    }
}
// ── Kernel Status (/sys/status) ─────────────────────────────────────────────
async function getKernelStatus(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const [processRes, agentRes, circuitRes, latencyRes, ipcRes] = await Promise.all([
        // Process counts from agent_runs — blocked = running runs whose agent has an open circuit breaker
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.emptyResult)([{ running: 0, queued: 0, blocked: 0, total: 0 }]), (0, db_1.safeQuery)(`
      SELECT
        COUNT(*) FILTER (WHERE ar.status = 'running')::int AS running,
        COUNT(*) FILTER (WHERE ar.status = 'awaiting_approval')::int AS queued,
        COUNT(*) FILTER (WHERE ar.status = 'running' AND cb.state = 'open')::int AS blocked,
        COUNT(*)::int AS total
      FROM "${schema}".agent_runs ar
      LEFT JOIN "${schema}".agent_circuit_breaker cb ON cb.agent_id = ar.agent_id
      WHERE ar.created_at > NOW() - INTERVAL '24 hours'
    `), { tenantId: tenantId, operation: 'query agent_runs' }),
        // Agent enabled/disabled from agent_runtime_config (real columns only)
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.emptyResult)([{ enabled: 0, disabled: 0 }]), (0, db_1.safeQuery)(`
      SELECT
        COUNT(*) FILTER (WHERE enabled = true)::int AS enabled,
        COUNT(*) FILTER (WHERE enabled = false)::int AS disabled
      FROM "${schema}".agent_runtime_config
    `), { tenantId: tenantId, operation: 'query agent_runtime_config' }),
        // Circuit open count from agent_circuit_breaker (real table, real column)
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.emptyResult)([{ circuit_open: 0 }]), (0, db_1.safeQuery)(`
      SELECT COUNT(*)::int AS circuit_open
      FROM "${schema}".agent_circuit_breaker
      WHERE state = 'open'
    `), { tenantId: tenantId, operation: 'query agent_runtime_config' }),
        // Latency + error rate from completed runs
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.emptyResult)([{ avg_latency: 0, total_tokens: 0, error_rate: 0 }]), (0, db_1.safeQuery)(`
      SELECT
        COALESCE(AVG(duration_ms), 0)::int AS avg_latency,
        COALESCE(SUM(tokens_used), 0)::int AS total_tokens,
        COALESCE(
          COUNT(*) FILTER (WHERE status = 'failed')::float /
          NULLIF(COUNT(*), 0), 0
        ) AS error_rate
      FROM "${schema}".agent_runs
      WHERE created_at > NOW() - INTERVAL '24 hours'
        AND status IN ('completed', 'failed')
    `), { tenantId: tenantId, operation: 'query agent_runs' }),
        // IPC queue depth from agent_handoffs
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.emptyResult)([{ pending: 0 }]), (0, db_1.safeQuery)(`
      SELECT COUNT(*)::int AS pending
      FROM "${schema}".agent_handoffs
      WHERE status = 'pending'
    `), { tenantId: tenantId, operation: 'query agent_runs' }),
    ]);
    const proc = (processRes.rows[0] || {});
    const agent = (agentRes.rows[0] || {});
    const circuit = (circuitRes.rows[0] || {});
    const lat = (latencyRes.rows[0] || {});
    const ipc = (ipcRes.rows[0] || {});
    // Token budget — tenant-level config (if table exists)
    let tokenBudget = 1_000_000;
    try {
        const budgetRes = await (0, db_1.safeQuery)(`SELECT monthly_token_budget FROM "${schema}".tenant_ai_config LIMIT 1`);
        if (budgetRes.rows[0]?.monthly_token_budget) {
            tokenBudget = Number(budgetRes.rows[0].monthly_token_budget);
        }
    }
    catch { /* table may not exist — use default */ }
    // Real token usage from agent_runs.tokens_used (migration 700)
    const tokensUsed24h = Number(lat.total_tokens) || 0;
    const tokenUtilization = Math.round((tokensUsed24h / Math.max(tokenBudget / 30, 1)) * 100);
    const schedulerLoad = Math.min(100, Math.round((Number(proc.running) * 10 + Number(proc.queued) * 5) /
        Math.max(Number(agent.enabled), 1)));
    const memoryPressure = tokenUtilization > 90 ? 'critical' :
        tokenUtilization > 70 ? 'high' :
            tokenUtilization > 40 ? 'medium' : 'low';
    // Boot time — earliest agent_runtime_config updated_at (no created_at column)
    let bootedAt = new Date().toISOString();
    try {
        const bootRes = await (0, db_1.safeQuery)(`SELECT MIN(updated_at) AS booted FROM "${schema}".agent_runtime_config`);
        if (bootRes.rows[0]?.booted)
            bootedAt = new Date(bootRes.rows[0].booted).toISOString();
    }
    catch { /* use now */ }
    const uptimeMs = Date.now() - new Date(bootedAt).getTime();
    const days = Math.floor(uptimeMs / 86_400_000);
    const hours = Math.floor((uptimeMs % 86_400_000) / 3_600_000);
    return {
        uptime: `${days}d ${hours}h`,
        bootedAt,
        processCount: {
            running: Number(proc.running) || 0,
            queued: Number(proc.queued) || 0,
            blocked: 0, // no 'blocked' status in schema; R1 if needed
            total: Number(proc.total) || 0,
        },
        agentCount: {
            enabled: Number(agent.enabled) || 0,
            disabled: Number(agent.disabled) || 0,
            circuitOpen: Number(circuit.circuit_open) || 0,
        },
        memoryPressure,
        schedulerLoad,
        ipcQueueDepth: Number(ipc.pending) || 0,
        resourceUsage: {
            tokensUsed24h,
            tokenBudget,
            tokenUtilization,
            avgLatencyMs: Number(lat.avg_latency) || 0,
            errorRate: Math.round((Number(lat.error_rate) || 0) * 100) / 100,
        },
    };
}
// ── Scheduler Table (/sys/scheduler) ────────────────────────────────────────
// Reads real scheduler state from public.job_registry (managed by job-scheduler.service.ts)
// Joins with tenant agent_runtime_config for per-agent enabled state
async function getSchedulerTable(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        // Read real scheduler entries from job_registry (public schema)
        const jobRes = await (0, db_1.query)(`SELECT job_name, cron_expression, enabled, last_run_at, last_status, next_run_at
       FROM public.job_registry
       WHERE job_name LIKE 'agent-%' OR job_name LIKE 'ai-%'
       ORDER BY job_name`);
        // Read per-agent enabled state from tenant config
        const agentRes = await (0, db_1.safeQuery)(`SELECT agent_id, enabled FROM "${schema}".agent_runtime_config`);
        const agentEnabled = new Map();
        for (const r of agentRes.rows) {
            agentEnabled.set(String(r.agent_id), r.enabled !== false);
        }
        return jobRes.rows.map((r, i) => {
            const jobName = String(r.job_name);
            // Extract agent_id from job name: "agent-inference-A01" → "A01"
            const agentMatch = jobName.match(/[Aa](\d{2})/);
            const agentId = agentMatch ? `A${agentMatch[1]}` : jobName;
            return {
                jobId: jobName,
                agentId,
                schedule: String(r.cron_expression || 'any'),
                nextRunAt: toISOOrNull(r.next_run_at),
                lastRunAt: toISOOrNull(r.last_run_at),
                lastResult: mapLastResult(r.last_status),
                priority: i,
                enabled: (r.enabled !== false) && (agentEnabled.get(agentId) !== false),
                backpressure: false, // R1: derive from circuit breaker in-memory state
            };
        });
    }
    catch (err) {
        observability_1.logger.warn('[Kernel] getSchedulerTable failed', { error: (0, db_1.toErrorMessage)(err) });
        return [];
    }
}
// ── IPC Message Bus (/sys/ipc) ──────────────────────────────────────────────
async function getIpcMessages(tenantId, limit = 50) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        const result = await (0, db_1.safeQuery)(`
      SELECT
        handoff_id AS message_id,
        from_agent_id AS from_agent,
        to_agent_id AS to_agent,
        handoff_type AS message_type,
        payload,
        status,
        created_at
      FROM "${schema}".agent_handoffs
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);
        return result.rows.map((r) => ({
            messageId: String(r.message_id),
            fromAgent: String(r.from_agent || ''),
            toAgent: String(r.to_agent || ''),
            messageType: String(r.message_type || 'handoff'),
            payload: safeParse(r.payload),
            status: String(r.status || 'pending'),
            createdAt: toISOOrNull(r.created_at) || new Date().toISOString(),
        }));
    }
    catch (err) {
        observability_1.logger.warn('[Kernel] getIpcMessages failed', { error: (0, db_1.toErrorMessage)(err) });
        return [];
    }
}
// ── Memory Partitions (/sys/memory) ─────────────────────────────────────────
async function getMemoryPartitions(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        const result = await (0, db_1.safeQuery)(`
      SELECT
        COALESCE(agent_id, '_system') AS agent_id,
        COUNT(*)::int AS memory_count,
        COALESCE(SUM(token_count), 0)::int AS total_tokens,
        MIN(created_at) AS oldest,
        MAX(created_at) AS newest,
        COALESCE(AVG(importance_score), 0.5)::float AS avg_importance,
        COUNT(*) FILTER (
          WHERE accessed_at < NOW() - INTERVAL '30 days' OR accessed_at IS NULL
        )::int AS stale_count
      FROM "${schema}".agent_memories
      WHERE deleted_at IS NULL
      GROUP BY COALESCE(agent_id, '_system')
      ORDER BY total_tokens DESC
    `);
        return result.rows.map((r) => ({
            agentId: String(r.agent_id),
            memoryCount: Number(r.memory_count) || 0,
            totalTokens: Number(r.total_tokens) || 0,
            oldestMemory: toISOOrNull(r.oldest),
            newestMemory: toISOOrNull(r.newest),
            avgImportance: Math.round((Number(r.avg_importance) || 0.5) * 100) / 100,
            staleCount: Number(r.stale_count) || 0,
        }));
    }
    catch (err) {
        observability_1.logger.warn('[Kernel] getMemoryPartitions failed', { error: (0, db_1.toErrorMessage)(err) });
        return [];
    }
}
// ── Kernel Event Log (/var/log/kernel) ──────────────────────────────────────
async function getKernelLog(tenantId, limit = 100) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        const result = await (0, db_1.safeQuery)(`
      (
        SELECT 'agent_run' AS source, agent_id, status AS event,
               run_id::text AS entity_id, created_at, duration_ms::text AS detail
        FROM "${schema}".agent_runs
        WHERE created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC LIMIT $1
      )
      UNION ALL
      (
        SELECT 'handoff' AS source, from_agent_id AS agent_id, status AS event,
               handoff_id::text AS entity_id, created_at, handoff_type AS detail
        FROM "${schema}".agent_handoffs
        WHERE created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC LIMIT $1
      )
      UNION ALL
      (
        SELECT 'signal' AS source, NULL AS agent_id, signal_code AS event,
               signal_id::text AS entity_id, detected_at AS created_at, status AS detail
        FROM "${schema}".governance_signals
        WHERE detected_at > NOW() - INTERVAL '24 hours'
        ORDER BY detected_at DESC LIMIT $1
      )
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);
        return result.rows.map((r) => ({
            timestamp: toISOOrNull(r.created_at) || new Date().toISOString(),
            source: r.source || 'agent_run',
            agentId: r.agent_id ? String(r.agent_id) : null,
            event: String(r.event || 'any'),
            entityId: String(r.entity_id || ''),
            detail: r.detail ? String(r.detail) : null,
        }));
    }
    catch (err) {
        observability_1.logger.warn('[Kernel] getKernelLog failed', { error: (0, db_1.toErrorMessage)(err) });
        return [];
    }
}
// ── Agent Lifecycle (systemctl) ─────────────────────────────────────────────
// Status enum: running|awaiting_approval|completed|failed|cancelled
async function killProcess(tenantId, runId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        const result = await (0, db_1.safeQuery)(`
      UPDATE "${schema}".agent_runs
      SET status = 'cancelled', updated_at = NOW()
      WHERE run_id = $1 AND status IN ('running', 'awaiting_approval')
    `, [runId]);
        return (result.rowCount ?? 0) > 0;
    }
    catch (err) {
        observability_1.logger.warn('[Kernel] killProcess failed', { runId, error: (0, db_1.toErrorMessage)(err) });
        return false;
    }
}
async function rebootAgent(tenantId, agentId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    let reset = false;
    let circuitCleared = false;
    try {
        // Clear circuit breaker. The original sidecar imported a service
        // from modules/ai/services/orchestration; that module is not present
        // in the dos-platform-core package boundary so we degrade gracefully —
        // the DB-state side of the reboot still runs.
        try {
            // best-effort: clear in-memory circuit if a runtime reset hook
            // happens to be globally exposed (e.g. by ai-engine-service).
            const reset = globalThis.__resetAgentCircuit;
            if (reset) {
                reset(tenantId, agentId);
                circuitCleared = true;
            }
        }
        catch {
            circuitCleared = false;
        }
        // Cancel any stuck runs — uses real status enum values
        await (0, db_1.safeQuery)(`
      UPDATE "${schema}".agent_runs
      SET status = 'cancelled', updated_at = NOW()
      WHERE agent_id = $1 AND status IN ('running', 'awaiting_approval')
    `, [agentId]);
        reset = true;
    }
    catch (err) {
        observability_1.logger.warn('[Kernel] rebootAgent partial failure', {
            agentId, error: (0, db_1.toErrorMessage)(err),
        });
    }
    return { reset, circuitCleared };
}
// ── Helpers ─────────────────────────────────────────────────────────────────
function mapRunStatus(s) {
    switch (s) {
        case 'running': return 'running';
        case 'awaiting_approval': return 'queued';
        case 'completed': return 'completed';
        case 'failed': return 'failed';
        case 'cancelled': return 'cancelled';
        default: return 'completed';
    }
}
function mapPriority(mode) {
    switch (mode) {
        case 'full_autonomous': return 'critical';
        case 'shadow_agent': return 'high';
        case 'hybrid': return 'medium';
        default: return 'low';
    }
}
function mapLastResult(s) {
    if (!s)
        return null;
    switch (s) {
        case 'success':
        case 'completed': return 'success';
        case 'failed':
        case 'error': return 'failure';
        case 'timeout':
        case 'timed_out': return 'timeout';
        case 'skipped': return 'skipped';
        default: return null;
    }
}
function toISOOrNull(val) {
    if (!val)
        return null;
    if (val instanceof Date)
        return val.toISOString();
    if (typeof val === 'string')
        return new Date(val).toISOString();
    return null;
}
function safeParse(payload) {
    if (!payload)
        return {};
    if (typeof payload === 'object' && payload !== null)
        return payload;
    try {
        return JSON.parse(String(payload));
    }
    catch {
        return { _parseError: true, _raw: String(payload).slice(0, 200) };
    }
}
// ── Kernel Commands (Pillar 1: Commander) ───────────────────────────────────
/**
 * Adjust an agent's autonomy level at runtime.
 * Levels: 'full_autonomous' | 'hybrid' | 'shadow_agent' | 'human'
 */
async function adjustAutonomyLevel(tenantId, agentId, level) {
    const s = (0, db_1.tenantSchema)(tenantId);
    const prev = await (0, db_1.safeQuery)(`SELECT autonomy_level FROM "${s}".agent_runtime_config WHERE agent_id = $1`, [agentId]);
    const previousLevel = String(prev.rows[0]?.autonomy_level || 'hybrid');
    await (0, db_1.safeQuery)(`UPDATE "${s}".agent_runtime_config SET autonomy_level = $2, updated_at = NOW() WHERE agent_id = $1`, [agentId, level]);
    await logKernelEvent(tenantId, 'autonomy_adjusted', agentId, { from: previousLevel, to: level });
    return { success: true, previousLevel, newLevel: level };
}
/**
 * Inject a priority directive into an agent's next cycle.
 * Stored in agent_runtime_config.priority_directive (JSON column).
 * One-shot: cleared after the agent reads it.
 */
async function injectPriority(tenantId, agentId, directive) {
    const s = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`UPDATE "${s}".agent_runtime_config SET priority_directive = $2::jsonb, updated_at = NOW() WHERE agent_id = $1`, [agentId, JSON.stringify(directive)]);
    await logKernelEvent(tenantId, 'priority_injected', agentId, directive);
    return { success: true, message: `Priority directive injected for ${agentId}: ${directive.focus}` };
}
/**
 * Abort a running agent action by marking the run as cancelled.
 */
async function killRunningAction(tenantId, runId) {
    const s = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`UPDATE "${s}".agent_runs SET status = 'cancelled', updated_at = NOW() WHERE run_id = $1 AND status = 'running'`, [runId]);
    await logKernelEvent(tenantId, 'action_killed', runId, { command: 'kill' });
    return { success: true, message: `Run ${runId} cancelled` };
}
/**
 * Get real token usage statistics over a rolling window.
 */
async function getTokenUsage(tenantId, windowHours = 24) {
    const s = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT agent_id, COALESCE(SUM(tokens_used), 0)::int AS total, COUNT(*)::int AS runs
     FROM "${s}".agent_runs
     WHERE created_at > NOW() - INTERVAL '1 hour' * $1
     GROUP BY agent_id`, [windowHours]);
    const byAgent = {};
    let totalTokens = 0;
    let totalRuns = 0;
    for (const row of result.rows) {
        byAgent[String(row.agent_id)] = Number(row.total);
        totalTokens += Number(row.total);
        totalRuns += Number(row.runs);
    }
    return { totalTokens, byAgent, avgPerRun: totalRuns > 0 ? Math.round(totalTokens / totalRuns) : 0 };
}
/**
 * Bulk command: set all agents to a specific autonomy level.
 */
async function setGlobalAutonomyLevel(tenantId, level) {
    const s = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`UPDATE "${s}".agent_runtime_config SET autonomy_level = $1, updated_at = NOW()`, [level]);
    await logKernelEvent(tenantId, 'global_autonomy_set', 'ALL', { level });
    return { success: true, agentsUpdated: result.rowCount || 0 };
}
/**
 * Read an agent's current priority directive (if any).
 */
async function getPriorityDirective(tenantId, agentId) {
    const s = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT priority_directive FROM "${s}".agent_runtime_config WHERE agent_id = $1`, [agentId]);
    const directive = result.rows[0]?.priority_directive;
    if (!directive)
        return null;
    return typeof directive === 'string' ? JSON.parse(directive) : directive;
}
/**
 * Clear the priority directive after agent consumption (one-shot).
 */
async function clearPriorityDirective(tenantId, agentId) {
    const s = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`UPDATE "${s}".agent_runtime_config SET priority_directive = NULL, updated_at = NOW() WHERE agent_id = $1`, [agentId]);
}
/** Log a kernel command event to the tenant event log. */
async function logKernelEvent(tenantId, eventType, entityId, payload) {
    try {
        const s = (0, db_1.tenantSchema)(tenantId);
        await (0, db_1.safeQuery)(`INSERT INTO "${s}".agrc_event_log (event_type, entity_type, entity_id, payload, created_at)
       VALUES ($1, 'kernel', $2, $3::jsonb, NOW())`, [eventType, entityId, JSON.stringify(payload)]);
    }
    catch { /* non-critical logging */ }
}
async function getProcessDetail(tenantId, pid) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        // 1. Get the run
        const runRes = await (0, db_1.safeQuery)(`
      SELECT run_id AS pid, agent_id, status AS state, COALESCE(platform_mode,'hybrid') AS priority,
             created_at AS started_at,
             CASE WHEN status IN ('completed','failed','cancelled') THEN updated_at ELSE NULL END AS completed_at,
             COALESCE(duration_ms,0) AS duration_ms, COALESCE(tokens_used,0) AS memory_used,
             parent_run_id AS parent_pid,
             CASE WHEN status='completed' THEN 0 WHEN status='failed' THEN 1 WHEN status='cancelled' THEN 3 ELSE NULL END AS exit_code
      FROM "${schema}".agent_runs WHERE run_id = $1
    `, [pid]);
        if (!runRes.rows[0])
            return null;
        const r = runRes.rows[0];
        const process = {
            pid: String(r.pid), agentId: String(r.agent_id), state: mapRunStatus(String(r.state || '')),
            priority: mapPriority(String(r.priority || '')), startedAt: toISOOrNull(r.started_at),
            completedAt: toISOOrNull(r.completed_at), durationMs: Number(r.duration_ms) || null,
            memoryUsed: Number(r.memory_used) || 0, cpuTime: Number(r.duration_ms) || 0,
            parentPid: r.parent_pid ? String(r.parent_pid) : null,
            exitCode: r.exit_code != null ? Number(r.exit_code) : null,
        };
        // 2. Get steps
        const stepsRes = await (0, db_1.safeQuery)(`
      SELECT step_id, node_id, step_type, COALESCE(label,'') AS label, status, started_at, ended_at
      FROM "${schema}".agent_steps WHERE run_id = $1 ORDER BY started_at NULLS LAST
    `, [pid]);
        const steps = stepsRes.rows.map((s) => ({
            stepId: String(s.step_id), nodeId: String(s.node_id), stepType: String(s.step_type || ''),
            label: String(s.label || ''), status: String(s.status || ''),
            startedAt: toISOOrNull(s.started_at), endedAt: toISOOrNull(s.ended_at),
        }));
        // 3. Get child runs
        const childRes = await (0, db_1.safeQuery)(`
      SELECT run_id AS pid, agent_id, status AS state, COALESCE(platform_mode,'hybrid') AS priority,
             created_at AS started_at,
             CASE WHEN status IN ('completed','failed','cancelled') THEN updated_at ELSE NULL END AS completed_at,
             COALESCE(duration_ms,0) AS duration_ms, COALESCE(tokens_used,0) AS memory_used,
             parent_run_id AS parent_pid,
             CASE WHEN status='completed' THEN 0 WHEN status='failed' THEN 1 WHEN status='cancelled' THEN 3 ELSE NULL END AS exit_code
      FROM "${schema}".agent_runs WHERE parent_run_id = $1 ORDER BY created_at
    `, [pid]);
        const childProcesses = childRes.rows.map((c) => ({
            pid: String(c.pid), agentId: String(c.agent_id), state: mapRunStatus(String(c.state || '')),
            priority: mapPriority(String(c.priority || '')), startedAt: toISOOrNull(c.started_at),
            completedAt: toISOOrNull(c.completed_at), durationMs: Number(c.duration_ms) || null,
            memoryUsed: Number(c.memory_used) || 0, cpuTime: Number(c.duration_ms) || 0,
            parentPid: c.parent_pid ? String(c.parent_pid) : null,
            exitCode: c.exit_code != null ? Number(c.exit_code) : null,
        }));
        return { process, steps, childProcesses };
    }
    catch (err) {
        observability_1.logger.warn('[Kernel] getProcessDetail failed', { pid, error: (0, db_1.toErrorMessage)(err) });
        return null;
    }
}
async function getAgentDetail(tenantId, agentId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        const [configRes, circuitRes, runsRes, memRes, recentRes] = await Promise.all([
            (0, db_1.safeQuery)(`SELECT enabled, paused_at, max_retries, cooldown_seconds FROM "${schema}".agent_runtime_config WHERE agent_id = $1`, [agentId]),
            (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.emptyResult)(), (0, db_1.safeQuery)(`SELECT state, failure_count, last_failure_at FROM "${schema}".agent_circuit_breaker WHERE agent_id = $1`, [agentId]), { tenantId: tenantId, operation: 'query agent_runtime_config' }),
            (0, db_1.safeQuery)(`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status='completed')::int AS completed,
               COUNT(*) FILTER (WHERE status='failed')::int AS failed,
               COALESCE(AVG(duration_ms),0)::int AS avg_duration
        FROM "${schema}".agent_runs WHERE agent_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
      `, [agentId]),
            (0, db_1.safeQuery)(`
        SELECT COALESCE(agent_id,'_system') AS agent_id, COUNT(*)::int AS memory_count,
               COALESCE(SUM(token_count),0)::int AS total_tokens, MIN(created_at) AS oldest,
               MAX(created_at) AS newest, COALESCE(AVG(importance_score),0.5)::float AS avg_importance,
               COUNT(*) FILTER (WHERE accessed_at < NOW()-INTERVAL '30 days' OR accessed_at IS NULL)::int AS stale_count
        FROM "${schema}".agent_memories WHERE agent_id = $1 AND deleted_at IS NULL GROUP BY 1
      `, [agentId]),
            (0, db_1.safeQuery)(`
        SELECT run_id AS pid, agent_id, status AS state, COALESCE(platform_mode,'hybrid') AS priority,
               created_at AS started_at, CASE WHEN status IN ('completed','failed','cancelled') THEN updated_at ELSE NULL END AS completed_at,
               COALESCE(duration_ms,0) AS duration_ms, COALESCE(tokens_used,0) AS memory_used, parent_run_id AS parent_pid,
               CASE WHEN status='completed' THEN 0 WHEN status='failed' THEN 1 WHEN status='cancelled' THEN 3 ELSE NULL END AS exit_code
        FROM "${schema}".agent_runs WHERE agent_id = $1 ORDER BY created_at DESC LIMIT 10
      `, [agentId]),
        ]);
        const cfg = configRes.rows[0];
        if (!cfg)
            return null;
        const cb = (circuitRes.rows[0] || {});
        const runs = (runsRes.rows[0] || {});
        const mem = memRes.rows[0];
        return {
            agentId,
            config: {
                enabled: cfg.enabled !== false,
                pausedAt: toISOOrNull(cfg.paused_at),
                maxRetries: Number(cfg.max_retries) || 3,
                cooldownSeconds: Number(cfg.cooldown_seconds) || 60,
            },
            circuit: {
                state: String(cb.state || 'closed'),
                failureCount: Number(cb.failure_count) || 0,
                lastFailureAt: toISOOrNull(cb.last_failure_at),
            },
            runs24h: {
                total: Number(runs.total) || 0,
                completed: Number(runs.completed) || 0,
                failed: Number(runs.failed) || 0,
                avgDurationMs: Number(runs.avg_duration) || 0,
            },
            memory: mem ? {
                agentId: String(mem.agent_id), memoryCount: Number(mem.memory_count) || 0,
                totalTokens: Number(mem.total_tokens) || 0, oldestMemory: toISOOrNull(mem.oldest),
                newestMemory: toISOOrNull(mem.newest),
                avgImportance: Math.round((Number(mem.avg_importance) || 0.5) * 100) / 100,
                staleCount: Number(mem.stale_count) || 0,
            } : null,
            recentRuns: recentRes.rows.map((r) => ({
                pid: String(r.pid), agentId: String(r.agent_id), state: mapRunStatus(String(r.state || '')),
                priority: mapPriority(String(r.priority || '')), startedAt: toISOOrNull(r.started_at),
                completedAt: toISOOrNull(r.completed_at), durationMs: Number(r.duration_ms) || null,
                memoryUsed: Number(r.memory_used) || 0, cpuTime: Number(r.duration_ms) || 0,
                parentPid: r.parent_pid ? String(r.parent_pid) : null,
                exitCode: r.exit_code != null ? Number(r.exit_code) : null,
            })),
        };
    }
    catch (err) {
        observability_1.logger.warn('[Kernel] getAgentDetail failed', { agentId, error: (0, db_1.toErrorMessage)(err) });
        return null;
    }
}
// ── R1: Pause / Resume ──────────────────────────────────────────────────────
async function pauseAgent(tenantId, agentId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        const result = await (0, db_1.safeQuery)(`UPDATE "${schema}".agent_runtime_config SET paused_at = NOW(), updated_at = NOW() WHERE agent_id = $1 AND paused_at IS NULL`, [agentId]);
        return (result.rowCount ?? 0) > 0;
    }
    catch (err) {
        observability_1.logger.warn('[Kernel] pauseAgent failed', { agentId, error: (0, db_1.toErrorMessage)(err) });
        return false;
    }
}
async function resumeAgent(tenantId, agentId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        const result = await (0, db_1.safeQuery)(`UPDATE "${schema}".agent_runtime_config SET paused_at = NULL, updated_at = NOW() WHERE agent_id = $1 AND paused_at IS NOT NULL`, [agentId]);
        return (result.rowCount ?? 0) > 0;
    }
    catch (err) {
        observability_1.logger.warn('[Kernel] resumeAgent failed', { agentId, error: (0, db_1.toErrorMessage)(err) });
        return false;
    }
}
async function getKernelHealth(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const [agentRes, circuitRes, stuckRes, failedRes, ipcRes] = await Promise.all([
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.emptyResult)([{ cnt: 0 }]), (0, db_1.safeQuery)(`SELECT COUNT(*) FILTER (WHERE enabled=true)::int AS cnt FROM "${schema}".agent_runtime_config`), { tenantId: tenantId, operation: 'query agent_runtime_config' }),
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.emptyResult)([{ cnt: 0 }]), (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".agent_circuit_breaker WHERE state='open'`), { tenantId: tenantId, operation: 'query agent_runtime_config' }),
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.emptyResult)([{ cnt: 0 }]), (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".agent_runs WHERE status='running' AND created_at < NOW()-INTERVAL '10 minutes'`), { tenantId: tenantId, operation: 'query agent_runtime_config' }),
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.emptyResult)([{ cnt: 0 }]), (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".agent_runs WHERE status='failed' AND created_at > NOW()-INTERVAL '24 hours'`), { tenantId: tenantId, operation: 'query agent_circuit_breaker' }),
        (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, db_1.emptyResult)([{ cnt: 0 }]), (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".agent_handoffs WHERE status='pending'`), { tenantId: tenantId, operation: 'query agent_runs' }),
    ]);
    const enabled = Number(agentRes.rows[0]?.cnt) || 0;
    const circuitOpen = Number(circuitRes.rows[0]?.cnt) || 0;
    const stuck = Number(stuckRes.rows[0]?.cnt) || 0;
    const failed = Number(failedRes.rows[0]?.cnt) || 0;
    const ipcPending = Number(ipcRes.rows[0]?.cnt) || 0;
    let status = 'UP';
    if (enabled === 0 || circuitOpen > Math.max(enabled / 2, 1)) {
        status = 'DOWN';
    }
    else if (stuck > 0 || failed > enabled * 3 || circuitOpen > 0) {
        status = 'DEGRADED';
    }
    return {
        status,
        checks: { enabledAgents: enabled, circuitOpenCount: circuitOpen, stuckRunCount: stuck, failedRuns24h: failed, ipcPendingCount: ipcPending },
        timestamp: new Date().toISOString(),
    };
}
// ── R1: Kernel Snapshots ────────────────────────────────────────────────────
async function saveKernelSnapshot(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const [status, processes] = await Promise.all([
        getKernelStatus(tenantId),
        getProcessTable(tenantId),
    ]);
    const snapshotData = {
        kernel: status,
        processSummary: {
            running: processes.filter(p => p.state === 'running').length,
            queued: processes.filter(p => p.state === 'queued').length,
            failed: processes.filter(p => p.state === 'failed').length,
            total: processes.length,
        },
        capturedAt: new Date().toISOString(),
    };
    const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".kernel_snapshots (tenant_id, snapshot_data) VALUES ($1, $2) RETURNING snapshot_id`, [tenantId, JSON.stringify(snapshotData)]);
    return result.rows[0]?.snapshot_id || '';
}
async function listKernelSnapshots(tenantId, limit = 20) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    try {
        const result = await (0, db_1.safeQuery)(`SELECT snapshot_id, created_at, snapshot_data FROM "${schema}".kernel_snapshots WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`, [tenantId, limit]);
        return result.rows.map((r) => ({
            snapshotId: String(r.snapshot_id),
            createdAt: toISOOrNull(r.created_at) || '',
            data: safeParse(r.snapshot_data),
        }));
    }
    catch (err) {
        observability_1.logger.warn('[Kernel] listKernelSnapshots failed', { error: (0, db_1.toErrorMessage)(err) });
        return [];
    }
}
//# sourceMappingURL=ai-os-kernel.service.js.map