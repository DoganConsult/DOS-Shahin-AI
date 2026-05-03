"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantPlatformMode = getTenantPlatformMode;
exports.getAgentPlatformMode = getAgentPlatformMode;
exports.getModeDirective = getModeDirective;
exports.gateActionWithPolicy = gateActionWithPolicy;
exports.queuePendingAction = queuePendingAction;
exports.getAgentRbacEntries = getAgentRbacEntries;
exports.getPendingActions = getPendingActions;
exports.reviewPendingAction = reviewPendingAction;
const db_1 = require("@dos/db");
const observability_1 = require("../observability");
const resilience_1 = require("../resilience");
const crypto_1 = require("crypto");
const KNOWN_MODES = new Set(['manual', 'hybrid', 'autonomous', 'human', 'copilot', 'assisted', 'hyper']);
function normalizePlatformMode(value) {
    if (typeof value !== 'string')
        return undefined;
    const normalized = value.trim().toLowerCase();
    if (KNOWN_MODES.has(normalized)) {
        return normalized;
    }
    return undefined;
}
async function readPlatformModeFromTenants(tenantId) {
    const result = await (0, db_1.safeQuery)(`SELECT settings->>'platform_mode' AS platform_mode FROM public.tenants WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
    return normalizePlatformMode(result.rows[0]?.platform_mode);
}
async function readPlatformModeFromPublicTenantSettings(tenantId) {
    const result = await (0, db_1.safeQuery)(`SELECT setting_value FROM public.tenant_settings WHERE tenant_id = $1 AND setting_key = 'platform_mode' LIMIT 1`, [tenantId]);
    return normalizePlatformMode(result.rows[0]?.setting_value);
}
async function readPlatformModeFromDosTenantSettings(tenantId) {
    const result = await (0, db_1.safeQuery)(`SELECT value FROM dos.tenant_settings WHERE key = 'platform_mode' AND (owner_user_id = $1 OR workspace_id = $1 OR scope = 'tenant') ORDER BY updated_at DESC LIMIT 1`, [tenantId]);
    const value = result.rows[0]?.value;
    if (typeof value === 'string') {
        return normalizePlatformMode(value);
    }
    if (value && typeof value === 'object' && 'platform_mode' in value) {
        return normalizePlatformMode(value.platform_mode);
    }
    return undefined;
}
async function getTenantPlatformMode(tenantId) {
    const fallback = normalizePlatformMode(process.env.DEFAULT_PLATFORM_MODE) ?? 'manual';
    for (const reader of [readPlatformModeFromTenants, readPlatformModeFromPublicTenantSettings, readPlatformModeFromDosTenantSettings]) {
        try {
            const mode = await reader(tenantId);
            if (mode)
                return mode;
        }
        catch (error) {
            observability_1.logger.debug('[PlatformModeGate] mode lookup fallback triggered', { tenantId, error: (0, resilience_1.toErrorMessage)(error) });
        }
    }
    return fallback;
}
async function getAgentPlatformMode(tenantId) {
    return getTenantPlatformMode(tenantId);
}
function getModeDirective(mode) {
    switch (mode) {
        case 'autonomous':
        case 'hyper':
            return 'execute';
        case 'hybrid':
        case 'copilot':
        case 'assisted':
            return 'suggest';
        default:
            return 'observe';
    }
}
async function gateActionWithPolicy(tenantId, action, riskLevel = 'low') {
    const mode = await getTenantPlatformMode(tenantId);
    if (mode === 'autonomous' || mode === 'hyper')
        return { allowed: true, mode, reason: `${mode} mode` };
    if ((mode === 'hybrid' || mode === 'copilot' || mode === 'assisted') && riskLevel === 'low') {
        return { allowed: true, mode, reason: `${mode} mode allows low-risk action` };
    }
    return { allowed: false, mode, reason: `${mode} mode blocks ${action}` };
}
async function ensurePendingActionsTable() {
    await (0, db_1.safeQuery)(`
    CREATE TABLE IF NOT EXISTS public.pending_agent_actions (
      pending_id VARCHAR(255) PRIMARY KEY,
      tenant_id VARCHAR(255) NOT NULL,
      actor_id VARCHAR(255),
      action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
async function queuePendingAction(tenantId, actorIdOrAction, action) {
    const pendingId = `pending-${(0, crypto_1.randomUUID)()}`;
    const actorId = typeof actorIdOrAction === 'string' ? actorIdOrAction : null;
    const payload = typeof actorIdOrAction === 'string' ? (action ?? {}) : actorIdOrAction;
    try {
        await ensurePendingActionsTable();
        await (0, db_1.safeQuery)(`INSERT INTO public.pending_agent_actions (pending_id, tenant_id, actor_id, action_payload) VALUES ($1, $2, $3, $4::jsonb)`, [pendingId, tenantId, actorId, JSON.stringify(payload)]);
    }
    catch (error) {
        observability_1.logger.warn('[PlatformModeGate] queuePendingAction persistence failed', { tenantId, pendingId, error: (0, resilience_1.toErrorMessage)(error) });
    }
    return pendingId;
}
function getAgentRbacEntries() {
    // Static catalog until canonical agent-rbac-registry is wired through Config OS.
    // Callers degrade safely on empty list.
    return [];
}
async function getPendingActions(tenantId, opts = {}) {
    try {
        await ensurePendingActionsTable();
        const limit = opts.limit && opts.limit > 0 ? Math.min(opts.limit, 500) : 50;
        const conditions = ['tenant_id = $1'];
        const params = [tenantId];
        if (opts.agentId) {
            conditions.push(`actor_id = $${params.length + 1}`);
            params.push(opts.agentId);
        }
        if (opts.status) {
            conditions.push(`status = $${params.length + 1}`);
            params.push(opts.status);
        }
        const where = conditions.join(' AND ');
        const result = await (0, db_1.safeQuery)(`SELECT pending_id, tenant_id, actor_id, action_payload, status, created_at
       FROM public.pending_agent_actions
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT ${limit}`, params);
        return result.rows;
    }
    catch (error) {
        observability_1.logger.debug('[PlatformModeGate] getPendingActions fallback', { tenantId, error: (0, resilience_1.toErrorMessage)(error) });
        return [];
    }
}
async function reviewPendingAction(tenantId, pendingId, reviewerId, approved, reviewNote) {
    try {
        await ensurePendingActionsTable();
        const next = approved ? 'approved' : 'rejected';
        const result = await (0, db_1.safeQuery)(`UPDATE public.pending_agent_actions
       SET status = $1
       WHERE pending_id = $2 AND tenant_id = $3
       RETURNING pending_id, tenant_id, actor_id, action_payload, status, created_at`, [next, pendingId, tenantId]);
        if (result.rows.length === 0)
            return { success: false };
        const row = result.rows[0];
        observability_1.logger.info('[PlatformModeGate] pending action reviewed', { tenantId, pendingId, reviewerId, approved, reviewNote });
        return { success: true, action: row };
    }
    catch (error) {
        observability_1.logger.warn('[PlatformModeGate] reviewPendingAction failed', { tenantId, pendingId, error: (0, resilience_1.toErrorMessage)(error) });
        return { success: false };
    }
}
//# sourceMappingURL=platform-mode-gate.service.js.map