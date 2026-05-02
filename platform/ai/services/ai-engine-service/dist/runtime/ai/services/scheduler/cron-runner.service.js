// @ts-nocheck
/**
 * cron-runner.service — autonomous time-based agent scheduler.
 *
 * Reads `dos.ai_workflow_triggers` and fires agent runs on a schedule. Supports:
 *   - rule.cron: standard 5-field crontab (minute hour dom mon dow), with `*`,
 *     numeric values, comma-lists, and `*\/N` step.
 *   - rule.everyMinutes: shorthand for "@every N minutes".
 *   - rule.atUtcHour, rule.atUtcMinute: shorthand for daily fire.
 *
 * The runner ticks every 60 seconds. Each tick:
 *   1. Loads enabled triggers from dos.ai_workflow_triggers
 *   2. Evaluates each rule against the current minute (UTC)
 *   3. For matching rows, fires runAgent({tenantId, agentId, query})
 *   4. Logs result into dos.ai_workflow_trigger_log
 *
 * Activated when env CRON_SCHEDULER_ENABLED=true (default: false).
 */
import { logger } from '../../ports/logger.port.js';
import { safeQuery } from '../../ports/database.port.js';
let intervalHandle = null;
let isTicking = false;
function fieldMatches(field, current, min, max) {
    if (!field || field === '*')
        return true;
    // step: */N
    const stepMatch = /^\*\/(\d+)$/.exec(field);
    if (stepMatch) {
        const step = parseInt(stepMatch[1], 10);
        if (!Number.isFinite(step) || step <= 0)
            return false;
        return (current - min) % step === 0;
    }
    // comma-list and ranges
    return field.split(',').some((part) => {
        const range = /^(\d+)-(\d+)$/.exec(part);
        if (range) {
            const lo = parseInt(range[1], 10);
            const hi = parseInt(range[2], 10);
            return current >= lo && current <= hi;
        }
        const n = parseInt(part, 10);
        return Number.isFinite(n) && n === current;
    });
}
function cronMatches(cron, now) {
    const fields = cron.trim().split(/\s+/);
    if (fields.length !== 5)
        return false;
    const [m, h, dom, mon, dow] = fields;
    return (fieldMatches(m, now.getUTCMinutes(), 0, 59) &&
        fieldMatches(h, now.getUTCHours(), 0, 23) &&
        fieldMatches(dom, now.getUTCDate(), 1, 31) &&
        fieldMatches(mon, now.getUTCMonth() + 1, 1, 12) &&
        fieldMatches(dow, now.getUTCDay(), 0, 6));
}
function ruleMatches(rule, now, lastFiredAt) {
    if (!rule || typeof rule !== 'object')
        return false;
    if (typeof rule.cron === 'string') {
        return cronMatches(rule.cron, now);
    }
    if (Number.isFinite(rule.everyMinutes) && rule.everyMinutes > 0) {
        const elapsedMs = now.getTime() - (lastFiredAt?.getTime() ?? 0);
        return elapsedMs >= Number(rule.everyMinutes) * 60_000;
    }
    if (Number.isFinite(rule.atUtcHour) && Number.isFinite(rule.atUtcMinute)) {
        const sameMinute = now.getUTCHours() === Number(rule.atUtcHour) &&
            now.getUTCMinutes() === Number(rule.atUtcMinute);
        if (!sameMinute)
            return false;
        if (!lastFiredAt)
            return true;
        return now.getTime() - lastFiredAt.getTime() >= 23 * 60 * 60 * 1000;
    }
    return false;
}
async function loadEnabledTriggers() {
    const res = await safeQuery(`SELECT trigger_id, tenant_id, module, signal, rule, workflow_code, enabled
       FROM dos.ai_workflow_triggers
      WHERE enabled = TRUE
        AND module = 'ai'
        AND (rule ? 'cron' OR rule ? 'everyMinutes' OR rule ? 'atUtcHour')`, []).catch(() => ({ rows: [] }));
    return (res.rows || []);
}
async function loadLastFiredAt(triggerId) {
    const res = await safeQuery(`SELECT MAX(emitted_at) AS last_fired_at FROM dos.ai_workflow_trigger_log WHERE trigger_id = $1`, [triggerId]).catch(() => ({ rows: [] }));
    const v = res.rows?.[0]?.last_fired_at;
    return v ? new Date(v) : null;
}
async function recordFire(triggerId, tenantId, module, signal, status, details) {
    await safeQuery(`INSERT INTO dos.ai_workflow_trigger_log (trigger_id, tenant_id, module, signal, payload, emitted_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`, [triggerId, tenantId, module, signal, JSON.stringify({ status, ...details })]).catch(() => undefined);
}
async function fireTrigger(trigger) {
    const agentId = trigger.rule?.agentId ||
        trigger.workflow_code ||
        trigger.signal ||
        'A01';
    const query = trigger.rule?.query || `Scheduled run: ${trigger.signal || trigger.workflow_code || 'autonomous'}`;
    try {
        const { runAgent } = await import('../agents/core/agent-runner.service.js');
        // Wave 4: attribute the run to the cron scheduler so DNOC/DSOC can filter
        // worker-driven agent runs from user-driven ones. The agent's own
        // surface:agent-<id> trace is preserved; we only enrich attribution.
        const result = await runAgent(trigger.tenant_id, agentId, {
            query,
            userId: `cron:${trigger.workflow_code || trigger.signal || trigger.trigger_id}`,
            sessionId: `trigger:${trigger.trigger_id}`,
        });
        await recordFire(trigger.trigger_id, trigger.tenant_id, trigger.module, trigger.signal, 'fired', {
            agentId,
            actionsProposed: result.actionsProposed,
            actionsExecuted: result.actionsExecuted,
            durationMs: result.durationMs,
        });
        logger.info('[cron-runner] trigger fired', { triggerId: trigger.trigger_id, agentId, tenantId: trigger.tenant_id });
    }
    catch (err) {
        await recordFire(trigger.trigger_id, trigger.tenant_id, trigger.module, trigger.signal, 'failed', { agentId, error: err?.message });
        logger.error('[cron-runner] trigger failed', { triggerId: trigger.trigger_id, error: err?.message });
    }
}
async function tick() {
    if (isTicking)
        return;
    isTicking = true;
    try {
        const now = new Date();
        const triggers = await loadEnabledTriggers();
        if (triggers.length === 0)
            return;
        for (const trigger of triggers) {
            const lastFiredAt = await loadLastFiredAt(trigger.trigger_id);
            if (!ruleMatches(trigger.rule, now, lastFiredAt))
                continue;
            // de-dup: don't fire the same minute twice
            if (lastFiredAt && now.getTime() - lastFiredAt.getTime() < 55_000)
                continue;
            // fire-and-record
            await fireTrigger(trigger);
        }
    }
    catch (err) {
        logger.warn('[cron-runner] tick error', { error: err?.message });
    }
    finally {
        isTicking = false;
    }
}
export function startCronRunner() {
    if (intervalHandle)
        return;
    if (process.env.CRON_SCHEDULER_ENABLED !== 'true') {
        logger.info('[cron-runner] disabled (set CRON_SCHEDULER_ENABLED=true to enable)');
        return;
    }
    // tick once shortly after startup, then every 60s
    setTimeout(() => { tick().catch(() => undefined); }, 5_000);
    intervalHandle = setInterval(() => { tick().catch(() => undefined); }, 60_000);
    logger.info('[cron-runner] started, ticking every 60s');
}
export function stopCronRunner() {
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
        logger.info('[cron-runner] stopped');
    }
}
//# sourceMappingURL=cron-runner.service.js.map