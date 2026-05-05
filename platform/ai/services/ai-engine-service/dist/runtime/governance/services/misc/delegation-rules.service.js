/**
 * delegation-rules.service — agent action delegation enforcement.
 *
 * Implements the contract used by agent-action-executor.service.ts. Mirrors
 * @dos/dauth-core/delegation/delegation-policy.service.ts (the canonical
 * implementation), ported in-place because the engine workspace does not
 * depend on @dos/dauth-core.
 *
 * Tables consulted (in the tenant schema):
 *   - shadow_agent_config (per-user agent enablement, daily caps, consent)
 *   - delegation_rules    (per-(user, agent, action) rules: risk caps,
 *                          time windows, explicit allow/deny, notification flag)
 *
 * Both tables are optional; when absent the function falls back to "allowed:
 * true, reason: no rules" so the engine boots cleanly on un-seeded tenants.
 */
import { safeQuery, tenantSchema } from '../../../ai/ports/database.port';
import { logger } from '../../../ai/ports/logger.port';
const RISK_ORDER = { low: 0, medium: 1, high: 2, critical: 3 };
function getFirstRow(result) {
    return result?.rows?.[0] ?? null;
}
function toErr(err) {
    if (err instanceof Error)
        return err.message;
    if (typeof err === 'string')
        return err;
    try {
        return JSON.stringify(err);
    }
    catch {
        return String(err);
    }
}
export async function getDelegationRules(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const res = await safeQuery(`SELECT * FROM "${schema}".delegation_rules WHERE tenant_id = $1`, [tenantId]);
        return res.rows || [];
    }
    catch {
        return [];
    }
}
export async function evaluateDelegationRule(rule, context) {
    if (!rule || rule.allowed === false)
        return false;
    if (rule.max_risk_level && context?.riskLevel) {
        const cap = RISK_ORDER[rule.max_risk_level] ?? 1;
        const have = RISK_ORDER[context.riskLevel] ?? 1;
        if (have > cap)
            return false;
    }
    if (rule.time_window_start && rule.time_window_end) {
        const now = new Date();
        const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (hhmm < rule.time_window_start || hhmm > rule.time_window_end)
            return false;
    }
    return true;
}
/**
 * Evaluate whether the given agent may execute the given action for this
 * tenant/user. Returns { allowed, reason, requiresNotification }.
 *
 * Order of checks:
 *   1. Shadow agent config (enabled? consent? daily cap?)
 *   2. Specific delegation rule for (user, agent, action)
 *   3. Default-allow with requiresNotification when no rule exists
 *
 * If the underlying tables don't exist (un-seeded tenant), falls back to
 * default-allow so the engine remains usable.
 */
export async function evaluateDelegation(tenantId, userId, agentId, actionType, riskLevel) {
    const schema = tenantSchema(tenantId);
    // 1. Shadow agent config — only relevant when userId is a real user (not 'system').
    if (userId && userId !== 'system') {
        try {
            const shadowResult = await safeQuery(`SELECT enabled, consent_granted, autonomy_level, max_actions_per_day,
                actions_today, actions_today_reset
           FROM "${schema}".shadow_agent_config
          WHERE tenant_id = $1 AND user_id = $2`, [tenantId, userId]);
            if (shadowResult.rows.length > 0) {
                const cfg = getFirstRow(shadowResult);
                if (!cfg.enabled) {
                    return { allowed: false, reason: 'Shadow agent is disabled', requiresNotification: false };
                }
                if (!cfg.consent_granted) {
                    return {
                        allowed: false,
                        reason: 'User has not granted consent for shadow agent memory/actions (PDPL)',
                        requiresNotification: true,
                    };
                }
                const today = new Date().toISOString().split('T')[0];
                const resetRaw = cfg.actions_today_reset;
                const resetDate = resetRaw
                    ? (resetRaw instanceof Date ? resetRaw.toISOString() : String(resetRaw)).split('T')[0]
                    : today;
                const actionsToday = resetDate === today ? Number(cfg.actions_today || 0) : 0;
                const maxPerDay = Number(cfg.max_actions_per_day || 0);
                if (maxPerDay > 0 && actionsToday >= maxPerDay) {
                    return {
                        allowed: false,
                        reason: `Daily action limit reached (${actionsToday}/${maxPerDay})`,
                        requiresNotification: true,
                    };
                }
            }
            // No shadow_agent_config row for this user → fall through to delegation rules.
        }
        catch (err) {
            // Table absent on this tenant; continue to default-allow path.
            logger.debug?.(`[delegation-rules] shadow_agent_config lookup skipped: ${toErr(err)}`);
        }
    }
    // 2. Specific delegation rule for (user, agent, action).
    try {
        const ruleResult = await safeQuery(`SELECT * FROM "${schema}".delegation_rules
        WHERE tenant_id = $1 AND user_id = $2 AND agent_id = $3 AND action_type = $4`, [tenantId, userId || 'system', agentId, actionType]);
        if (ruleResult.rows.length > 0) {
            const rule = getFirstRow(ruleResult);
            if (rule.allowed === false) {
                return {
                    allowed: false,
                    reason: `Delegation rule explicitly blocks ${actionType} for agent ${agentId}`,
                    requiresNotification: !!rule.requires_notification,
                };
            }
            const actionRisk = RISK_ORDER[riskLevel] ?? 1;
            const maxRisk = RISK_ORDER[rule.max_risk_level] ?? 3;
            if (actionRisk > maxRisk) {
                return {
                    allowed: false,
                    reason: `Risk level ${riskLevel} exceeds max allowed ${rule.max_risk_level} for ${actionType}`,
                    requiresNotification: !!rule.requires_notification,
                };
            }
            if (rule.time_window_start && rule.time_window_end) {
                const now = new Date();
                const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                if (hhmm < rule.time_window_start || hhmm > rule.time_window_end) {
                    return {
                        allowed: false,
                        reason: `Outside allowed time window (${rule.time_window_start}-${rule.time_window_end})`,
                        requiresNotification: !!rule.requires_notification,
                    };
                }
            }
            return {
                allowed: true,
                reason: `Delegation rule allows ${actionType} for ${agentId}`,
                requiresNotification: !!rule.requires_notification,
            };
        }
    }
    catch (err) {
        logger.debug?.(`[delegation-rules] delegation_rules lookup skipped: ${toErr(err)}`);
    }
    // 3. Default-allow when no rule and no shadow config dictates otherwise.
    return {
        allowed: true,
        reason: 'No explicit delegation rule; default allow',
        requiresNotification: true,
    };
}
/**
 * Increment per-user daily action counter after a successful agent action.
 * No-op when shadow_agent_config table is absent.
 */
export async function incrementDailyActions(tenantId, userId) {
    if (!userId || userId === 'system')
        return;
    const schema = tenantSchema(tenantId);
    const today = new Date().toISOString().split('T')[0];
    try {
        await safeQuery(`UPDATE "${schema}".shadow_agent_config
          SET actions_today = CASE WHEN actions_today_reset::text = $3 THEN actions_today + 1 ELSE 1 END,
              actions_today_reset = $3
        WHERE tenant_id = $1 AND user_id = $2`, [tenantId, userId, today]);
    }
    catch {
        /* table absent */
    }
}
//# sourceMappingURL=delegation-rules.service.js.map