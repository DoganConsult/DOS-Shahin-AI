/**
 * AI Agent Configuration Service
 * ─────────────────────────────────
 * DB-driven agent configuration with per-tenant operating states.
 * Replaces hardcoded agent parameters with configurable DB entries.
 *
 * Enterprise features:
 *   - Per-tenant agent enable/disable/trial states
 *   - DB-driven circuit breaker thresholds
 *   - Model/temperature/max_tokens configuration per agent
 *   - Tool assignment per agent
 *   - Admin API for runtime management
 *   - Cron scheduling configuration
 */
import { safeQuery, tenantSchema } from '../../../ports/database.port.js';
import { logger } from '../../../ports/logger.port.js';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
// ── Cache ───────────────────────────────────────────────────────────────
const _configCache = new Map();
const CACHE_TTL_MS = 60_000; // 1 minute
// ── Default agent configs (fallback) ────────────────────────────────────
const DEFAULT_CONFIG = {
    model: 'claude-sonnet-4-20250514',
    temperature: 0.3,
    maxTokens: 4096,
    maxActionsPerRun: 5,
    enabled: true,
    operatingState: 'on',
    priority: 5,
    cbFailureThreshold: 5,
    cbSuccessThreshold: 2,
    cbTimeoutMs: 60000,
    cbWindowMs: 300000,
};
// ── Core API ────────────────────────────────────────────────────────────
/**
 * Get agent configuration from DB. Cached for 1 minute.
 * Falls back to defaults if DB unavailable or agent not configured.
 */
export async function getAgentConfig(tenantId, agentId) {
    const cacheKey = `${tenantId}:${agentId}`;
    const cached = _configCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS)
        return cached.config;
    try {
        const schema = tenantSchema(tenantId);
        const result = await safeQuery(`SELECT * FROM "${schema}".ai_agent_configs WHERE tenant_id = $1 AND agent_id = $2`, [tenantId, agentId]);
        const row = getFirstRow(result);
        if (!row)
            return null;
        const config = mapRowToConfig(row);
        _configCache.set(cacheKey, { config, ts: Date.now() });
        return config;
    }
    catch (err) {
        logger.warn('[AgentConfig] DB lookup failed, returning null', { error: toErrorMessage(err), tenantId, agentId });
        return null;
    }
}
/**
 * Get all enabled agents for a tenant.
 */
export async function getEnabledAgents(tenantId) {
    try {
        const schema = tenantSchema(tenantId);
        const result = await safeQuery(`SELECT * FROM "${schema}".ai_agent_configs
       WHERE tenant_id = $1 AND enabled = TRUE AND operating_state IN ('on', 'trial')
       ORDER BY priority ASC, agent_id`, [tenantId]);
        return result.rows.map(mapRowToConfig);
    }
    catch (err) {
        logger.warn('[AgentConfig] Failed to list enabled agents', { error: toErrorMessage(err), tenantId });
        return [];
    }
}
/**
 * Check if an agent can execute (enabled + not in maintenance/off + trial not expired).
 */
export async function canAgentExecute(tenantId, agentId) {
    const config = await getAgentConfig(tenantId, agentId);
    if (!config)
        return { allowed: true }; // No config = use defaults (backwards compat)
    if (!config.enabled)
        return { allowed: false, reason: 'Agent disabled by admin' };
    if (config.operatingState === 'off')
        return { allowed: false, reason: 'Agent state: off' };
    if (config.operatingState === 'maintenance')
        return { allowed: false, reason: 'Agent in maintenance mode' };
    if (config.operatingState === 'trial' && config.trialExpiresAt && new Date() > config.trialExpiresAt) {
        return { allowed: false, reason: 'Agent trial expired' };
    }
    return { allowed: true };
}
/**
 * Get circuit breaker config for an agent (DB-driven thresholds).
 */
export async function getCircuitBreakerConfig(tenantId, agentId) {
    const config = await getAgentConfig(tenantId, agentId);
    return {
        failureThreshold: config?.cbFailureThreshold ?? DEFAULT_CONFIG.cbFailureThreshold,
        successThreshold: config?.cbSuccessThreshold ?? DEFAULT_CONFIG.cbSuccessThreshold,
        timeoutMs: config?.cbTimeoutMs ?? DEFAULT_CONFIG.cbTimeoutMs,
        windowMs: config?.cbWindowMs ?? DEFAULT_CONFIG.cbWindowMs,
    };
}
// ── Admin Operations ────────────────────────────────────────────────────
export async function upsertAgentConfig(tenantId, agentId, updates, createdBy) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`INSERT INTO "${schema}".ai_agent_configs
       (tenant_id, agent_id, display_name, description_en, model, temperature, max_tokens,
        system_prompt_key, tools_enabled, max_actions_per_run, enabled, operating_state,
        trial_expires_at, priority, cb_failure_threshold, cb_success_threshold,
        cb_timeout_ms, cb_window_ms, cron_expression, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       ON CONFLICT (tenant_id, agent_id) DO UPDATE SET
         display_name = COALESCE(EXCLUDED.display_name, ai_agent_configs.display_name),
         description_en = COALESCE(EXCLUDED.description_en, ai_agent_configs.description_en),
         model = COALESCE(EXCLUDED.model, ai_agent_configs.model),
         temperature = COALESCE(EXCLUDED.temperature, ai_agent_configs.temperature),
         max_tokens = COALESCE(EXCLUDED.max_tokens, ai_agent_configs.max_tokens),
         system_prompt_key = COALESCE(EXCLUDED.system_prompt_key, ai_agent_configs.system_prompt_key),
         tools_enabled = COALESCE(EXCLUDED.tools_enabled, ai_agent_configs.tools_enabled),
         max_actions_per_run = COALESCE(EXCLUDED.max_actions_per_run, ai_agent_configs.max_actions_per_run),
         enabled = COALESCE(EXCLUDED.enabled, ai_agent_configs.enabled),
         operating_state = COALESCE(EXCLUDED.operating_state, ai_agent_configs.operating_state),
         trial_expires_at = EXCLUDED.trial_expires_at,
         priority = COALESCE(EXCLUDED.priority, ai_agent_configs.priority),
         cb_failure_threshold = COALESCE(EXCLUDED.cb_failure_threshold, ai_agent_configs.cb_failure_threshold),
         cb_success_threshold = COALESCE(EXCLUDED.cb_success_threshold, ai_agent_configs.cb_success_threshold),
         cb_timeout_ms = COALESCE(EXCLUDED.cb_timeout_ms, ai_agent_configs.cb_timeout_ms),
         cb_window_ms = COALESCE(EXCLUDED.cb_window_ms, ai_agent_configs.cb_window_ms),
         cron_expression = EXCLUDED.cron_expression,
         updated_at = NOW()
       RETURNING config_id`, [
            tenantId, agentId,
            updates.displayName ?? agentId,
            updates.descriptionEn,
            updates.model ?? DEFAULT_CONFIG.model,
            updates.temperature ?? DEFAULT_CONFIG.temperature,
            updates.maxTokens ?? DEFAULT_CONFIG.maxTokens,
            updates.systemPromptKey,
            updates.toolsEnabled ?? [],
            updates.maxActionsPerRun ?? DEFAULT_CONFIG.maxActionsPerRun,
            updates.enabled ?? DEFAULT_CONFIG.enabled,
            updates.operatingState ?? DEFAULT_CONFIG.operatingState,
            updates.trialExpiresAt,
            updates.priority ?? DEFAULT_CONFIG.priority,
            updates.cbFailureThreshold ?? DEFAULT_CONFIG.cbFailureThreshold,
            updates.cbSuccessThreshold ?? DEFAULT_CONFIG.cbSuccessThreshold,
            updates.cbTimeoutMs ?? DEFAULT_CONFIG.cbTimeoutMs,
            updates.cbWindowMs ?? DEFAULT_CONFIG.cbWindowMs,
            updates.cronExpression,
            createdBy,
        ]);
        _configCache.delete(`${tenantId}:${agentId}`);
        return result.rows[0]?.config_id ?? null;
    }
    catch (err) {
        logger.warn('[AgentConfig] Upsert failed', { error: toErrorMessage(err), tenantId, agentId });
        return null;
    }
}
export async function setAgentOperatingState(tenantId, agentId, state, trialExpiresAt) {
    const schema = tenantSchema(tenantId);
    try {
        await safeQuery(`UPDATE "${schema}".ai_agent_configs
       SET operating_state = $1, trial_expires_at = $2, updated_at = NOW()
       WHERE tenant_id = $3 AND agent_id = $4`, [state, trialExpiresAt ?? null, tenantId, agentId]);
        _configCache.delete(`${tenantId}:${agentId}`);
        return true;
    }
    catch {
        return false;
    }
}
export function invalidateAgentConfigCache(tenantId, agentId) {
    if (tenantId && agentId) {
        _configCache.delete(`${tenantId}:${agentId}`);
    }
    else if (tenantId) {
        for (const key of _configCache.keys()) {
            if (key.startsWith(`${tenantId}:`))
                _configCache.delete(key);
        }
    }
    else {
        _configCache.clear();
    }
}
// ── Helpers ─────────────────────────────────────────────────────────────
function mapRowToConfig(row) {
    return {
        configId: row.config_id,
        agentId: row.agent_id,
        displayName: row.display_name,
        descriptionEn: row.description_en,
        model: row.model,
        temperature: row.temperature,
        maxTokens: row.max_tokens,
        systemPromptKey: row.system_prompt_key,
        toolsEnabled: row.tools_enabled ?? [],
        maxActionsPerRun: row.max_actions_per_run,
        enabled: row.enabled,
        operatingState: row.operating_state,
        trialExpiresAt: row.trial_expires_at ? new Date(row.trial_expires_at) : null,
        priority: row.priority,
        cbFailureThreshold: row.cb_failure_threshold,
        cbSuccessThreshold: row.cb_success_threshold,
        cbTimeoutMs: row.cb_timeout_ms,
        cbWindowMs: row.cb_window_ms,
        cronExpression: row.cron_expression,
        lastRunAt: row.last_run_at ? new Date(row.last_run_at) : null,
    };
}
//# sourceMappingURL=ai-agent-config.service.js.map