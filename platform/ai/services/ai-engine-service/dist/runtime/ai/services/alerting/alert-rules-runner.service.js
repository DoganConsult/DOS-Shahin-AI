/**
 * Wave 6 — Alert Rules Runner.
 *
 * Ticks every 60s. For each enabled row in public.ai_alert_rules, evaluates
 * the condition against the live aggregator services (DNOC cost-rollup, DSOC
 * gate-stats, DSOC hitl-backlog, DNOC agent-health). On breach, writes a
 * public.ai_activity_alerts row and (best-effort) hands off to the platform
 * notification-service for email/Slack delivery.
 *
 * Per-rule throttle: a rule will not fire again within `condition_config.throttleMinutes`
 * (default 30 min) — implemented by checking ai_activity_alerts for matching
 * rule entity_id within the last throttle window.
 *
 * Activated when env CRON_SCHEDULER_ENABLED=true && AI_ALERTING_ENABLED=true.
 *
 * Read-only against the source tables; writes only to ai_activity_alerts.
 */
import { logger } from '../../ports/logger.port.js';
import { safeQuery } from '../../ports/database.port.js';
import { eventBus } from '../../ports/events.port.js';
let intervalHandle = null;
let isTicking = false;
const platformQuery = async (text, params = []) => {
    const r = await safeQuery(text, params);
    return { rows: r.rows };
};
async function loadEnabledRules() {
    const r = await safeQuery(`SELECT id, tenant_id, rule_name, condition_type, condition_config, severity, message_template, is_active
       FROM public.ai_alert_rules
      WHERE is_active = TRUE`, []).catch(() => ({ rows: [] }));
    return r.rows.map((row) => ({
        ...row,
        condition_config: typeof row.condition_config === 'string'
            ? safeJSON(row.condition_config)
            : (row.condition_config || {}),
        severity: row.severity || 'warning',
    }));
}
async function recentlyFired(ruleId, throttleMinutes) {
    const r = await safeQuery(`SELECT 1
       FROM public.ai_activity_alerts
      WHERE entity_id = $1
        AND created_at >= NOW() - ($2 || ' minutes')::interval
      LIMIT 1`, [ruleId, throttleMinutes]).catch(() => ({ rows: [] }));
    return r.rows.length > 0;
}
async function recordAlert(rule, breach) {
    const firedAt = new Date().toISOString();
    await safeQuery(`INSERT INTO public.ai_activity_alerts
       (tenant_id, alert_type, severity, message, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`, [
        breach.tenantId,
        'rule_breach',
        rule.severity,
        breach.message,
        breach.entityType ?? 'ai_alert_rule',
        rule.id, // use rule_id as entity_id so throttle dedup keys cleanly
        JSON.stringify({ ruleName: rule.rule_name, conditionType: rule.condition_type, ...breach.metadata }),
    ]).catch((err) => logger.warn('[alerts] insert failed', { error: err?.message }));
    // Publish the canonical platform event. notification-service subscribes to
    // `ai.alert.fired` and fans out to (a) inbox notification, (b) bilingual
    // MJML email to per-tenant alert recipients, (c) Slack webhook. We do NOT
    // call createNotification directly here — that would couple ai-engine to
    // notification-service internals and bypass Slack delivery.
    try {
        await eventBus.publish({
            eventType: 'ai.alert.fired',
            tenantId: breach.tenantId ?? null,
            sourceService: 'ai-engine-service',
            payload: {
                ruleId: rule.id,
                ruleName: rule.rule_name,
                conditionType: rule.condition_type,
                severity: rule.severity,
                message: breach.message,
                entityType: breach.entityType ?? 'ai_alert_rule',
                entityId: breach.entityId ?? rule.id,
                tenantId: breach.tenantId,
                firedAt,
                metadata: breach.metadata,
            },
        });
    }
    catch (err) {
        logger.warn('[alerts] event publish failed', { error: err?.message, ruleName: rule.rule_name });
    }
}
// ── Condition evaluators ───────────────────────────────────────────
async function evalCostCapPctAbove(rule) {
    const threshold = Number(rule.condition_config?.threshold ?? 80);
    const { getCostRollup } = await import('../dnoc-ops/cost-rollup.service.js');
    const rows = await getCostRollup(platformQuery, { tenantId: rule.tenant_id ?? undefined });
    return rows
        .filter((r) => r.pctOfCapToday >= threshold)
        .map((r) => ({
        tenantId: r.tenantId,
        entityType: 'tenant_cost',
        entityId: r.tenantId,
        message: rule.message_template ||
            `Tenant ${r.tenantId} is at ${r.pctOfCapToday}% of daily AI cap ($${r.spentUsdToday.toFixed(2)} / $${r.capUsdDaily.toFixed(2)})`,
        metadata: { pct: r.pctOfCapToday, spent: r.spentUsdToday, cap: r.capUsdDaily },
    }));
}
async function evalHitlBacklogAbove(rule) {
    const threshold = Number(rule.condition_config?.threshold ?? 20);
    const { getHITLBacklogSummary } = await import('../dsoc-security/hitl-queue.service.js');
    const rows = await getHITLBacklogSummary(platformQuery);
    const filtered = rule.tenant_id ? rows.filter((r) => r.tenantId === rule.tenant_id) : rows;
    return filtered
        .filter((r) => r.pending >= threshold)
        .map((r) => ({
        tenantId: r.tenantId,
        entityType: 'hitl_backlog',
        entityId: r.tenantId,
        message: rule.message_template ||
            `HITL backlog for tenant ${r.tenantId}: ${r.pending} pending (oldest ${Math.floor(r.oldestPendingAge / 60)}min)`,
        metadata: { pending: r.pending, escalated: r.escalated, oldestAgeSeconds: r.oldestPendingAge },
    }));
}
async function evalAgentFailureRateAbove(rule) {
    const thresholdPct = Number(rule.condition_config?.thresholdPct ?? 25);
    const windowHours = Number(rule.condition_config?.windowHours ?? 1);
    const minRuns = Number(rule.condition_config?.minRuns ?? 3);
    const { getAgentHealth } = await import('../dnoc-ops/agent-health.service.js');
    const rows = await getAgentHealth(platformQuery, null, {
        tenantId: rule.tenant_id ?? undefined,
        windowHours,
    });
    return rows
        .filter((r) => r.runs >= minRuns && r.errorRate * 100 >= thresholdPct)
        .map((r) => ({
        tenantId: r.tenantId,
        entityType: 'agent_health',
        entityId: `${r.tenantId}:${r.agentId}`,
        message: rule.message_template ||
            `Agent ${r.agentId} (${r.agentName}) on tenant ${r.tenantId}: error rate ${(r.errorRate * 100).toFixed(1)}% over last ${windowHours}h (${r.runs} runs)`,
        metadata: { errorRate: r.errorRate, runs: r.runs, agentId: r.agentId, agentName: r.agentName },
    }));
}
async function evalSoDViolationsAbove(rule) {
    const thresholdCount = Number(rule.condition_config?.thresholdCount ?? 5);
    const windowHours = Number(rule.condition_config?.windowHours ?? 1);
    const tenantClause = rule.tenant_id ? `AND tenant_id = $2` : '';
    const params = [windowHours];
    if (rule.tenant_id)
        params.push(rule.tenant_id);
    const r = await safeQuery(`SELECT tenant_id, COUNT(*)::int AS n
       FROM dos.audit_trail
      WHERE module = 'ai'
        AND action = 'agent.tool.denied'
        AND payload->>'decidedBy' = 'sod_policy'
        AND created_at >= NOW() - ($1 || ' hours')::interval
        ${tenantClause}
      GROUP BY tenant_id
     HAVING COUNT(*) >= $${rule.tenant_id ? 3 : 2}`, [...params, thresholdCount]).catch(() => ({ rows: [] }));
    return r.rows.map((row) => ({
        tenantId: row.tenant_id,
        entityType: 'sod_storm',
        entityId: row.tenant_id,
        message: rule.message_template ||
            `Tenant ${row.tenant_id}: ${row.n} SoD violations in last ${windowHours}h (threshold ${thresholdCount})`,
        metadata: { count: Number(row.n), windowHours },
    }));
}
async function evalDenyRateAbove(rule) {
    const thresholdPct = Number(rule.condition_config?.thresholdPct ?? 30);
    const windowHours = Number(rule.condition_config?.windowHours ?? 1);
    const minDecisions = Number(rule.condition_config?.minDecisions ?? 5);
    const { getGateDecisionStats } = await import('../dsoc-security/gate-decisions.service.js');
    const stats = await getGateDecisionStats(platformQuery, {
        tenantId: rule.tenant_id ?? undefined,
        windowHours,
    });
    const total = stats.allowed + stats.denied;
    if (total < minDecisions)
        return [];
    const denyPct = (stats.denied / total) * 100;
    if (denyPct < thresholdPct)
        return [];
    return [{
            tenantId: rule.tenant_id,
            entityType: 'gate_deny_rate',
            entityId: `deny-rate-${rule.tenant_id || 'all'}`,
            message: rule.message_template ||
                `Gate deny rate ${denyPct.toFixed(1)}% over last ${windowHours}h (${stats.denied}/${total})`,
            metadata: { denyRate: denyPct, allowed: stats.allowed, denied: stats.denied, byDecidedBy: stats.byDecidedBy },
        }];
}
async function evalShiftsStalled(rule) {
    // SB-5: detect that the AI-HR shift runner has stalled. Each shift
    // execution writes a row to public.ai_employee_reports + an audit-trail
    // entry. If neither has happened in the last `windowMinutes`, ops needs
    // to investigate (cron-runner died, DB connection broke, etc).
    const windowMinutes = Number(rule.condition_config?.windowMinutes ?? 90);
    const minExpected = Number(rule.condition_config?.minExpected ?? 1);
    const r = await safeQuery(`SELECT count(*)::int AS n FROM public.ai_employee_reports
      WHERE filed_at >= NOW() - ($1 || ' minutes')::interval`, [windowMinutes]).catch(() => ({ rows: [{ n: 0 }] }));
    const n = Number(r.rows[0]?.n ?? 0);
    if (n >= minExpected)
        return [];
    return [{
            tenantId: null,
            entityType: 'ai_employee_shifts',
            entityId: 'platform-runner',
            message: rule.message_template ||
                `AI-HR shift runner stalled — ${n} report(s) in last ${windowMinutes}m (expected ≥ ${minExpected}).`,
            metadata: { windowMinutes, observed: n, minExpected },
        }];
}
async function evaluateRule(rule) {
    switch (rule.condition_type) {
        case 'cost_cap_pct_above': return evalCostCapPctAbove(rule);
        case 'hitl_backlog_above': return evalHitlBacklogAbove(rule);
        case 'agent_failure_rate_above': return evalAgentFailureRateAbove(rule);
        case 'sod_violations_above': return evalSoDViolationsAbove(rule);
        case 'deny_rate_above': return evalDenyRateAbove(rule);
        case 'shifts_stalled': return evalShiftsStalled(rule);
        default:
            logger.warn?.('[alerts] unknown condition_type', { type: rule.condition_type });
            return [];
    }
}
async function tick() {
    if (isTicking)
        return;
    isTicking = true;
    try {
        const rules = await loadEnabledRules();
        if (rules.length === 0)
            return;
        for (const rule of rules) {
            const throttleMin = Number(rule.condition_config?.throttleMinutes ?? 30);
            if (await recentlyFired(rule.id, throttleMin))
                continue;
            const breaches = await evaluateRule(rule).catch((err) => {
                logger.warn?.('[alerts] rule evaluation failed', { ruleName: rule.rule_name, error: err?.message });
                return [];
            });
            for (const b of breaches) {
                await recordAlert(rule, b);
                logger.info?.('[alerts] rule fired', { ruleName: rule.rule_name, severity: rule.severity, ...b.metadata });
            }
        }
    }
    catch (err) {
        logger.warn?.('[alerts] tick error', { error: err?.message });
    }
    finally {
        isTicking = false;
    }
}
export function startAlertRulesRunner() {
    if (intervalHandle)
        return;
    if (process.env.AI_ALERTING_ENABLED !== 'true') {
        logger.info?.('[alerts] disabled (set AI_ALERTING_ENABLED=true to enable)');
        return;
    }
    setTimeout(() => { tick().catch(() => undefined); }, 7_000);
    intervalHandle = setInterval(() => { tick().catch(() => undefined); }, 60_000);
    logger.info?.('[alerts] rules runner started (60s tick)');
}
export function stopAlertRulesRunner() {
    if (intervalHandle) {
        clearInterval(intervalHandle);
        intervalHandle = null;
    }
}
function safeJSON(s) {
    try {
        return JSON.parse(s);
    }
    catch {
        return {};
    }
}
//# sourceMappingURL=alert-rules-runner.service.js.map