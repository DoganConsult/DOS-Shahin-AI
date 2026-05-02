/**
 * Workflow AI Agent Policy Service — Controls what agents can/cannot do in workflows.
 *
 * Manages per-module AI policies, restricted action lists, autonomy boundaries,
 * and eligibility checks. All policy decisions are audited.
 *
 * @owner workflow module
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// ── Types ──────────────────────────────────────────────────────────

export interface WorkflowAiPolicy {
  moduleCode: string;
  allowObserve: boolean;
  allowSuggest: boolean;
  allowExecute: boolean;
  restrictedActions: string[];
  maxConfidenceThreshold: number;
  requireHumanReviewAboveRisk: 'low' | 'medium' | 'high' | 'critical';
  updatedAt: string;
}

export interface AgentEligibility {
  allowed: boolean;
  reason: string;
  capabilities: string[];
}

// ── Default Restricted Actions (never allowed for agents) ──────────

const GLOBAL_RESTRICTED_ACTIONS = [
  'delete_production_data',
  'approve_own_work',
  'bypass_dauth',
  'modify_security_policy',
  'revoke_user_access',
  'delete_audit_trail',
  'override_sod_rule',
  'modify_encryption_keys',
  'disable_mfa',
  'grant_admin_role',
];

// ── Policy CRUD ────────────────────────────────────────────────────

/**
 * Get AI workflow policy for a module. Returns defaults if none configured.
 */
export async function getWorkflowAiPolicy(tenantId: string, moduleCode: string): Promise<WorkflowAiPolicy> {
  const schema = tenantSchema(tenantId);

  try {
    const { rows } = await safeQuery(
      `SELECT module_code, allow_observe, allow_suggest, allow_execute,
              restricted_actions, max_confidence_threshold,
              require_human_review_above_risk, updated_at
       FROM "${schema}".workflow_ai_policies
       WHERE module_code = $1 LIMIT 1`,
      [moduleCode],
    );

    if (rows.length > 0) {
      const r = rows[0];
      return {
        moduleCode: r.module_code,
        allowObserve: r.allow_observe ?? true,
        allowSuggest: r.allow_suggest ?? true,
        allowExecute: r.allow_execute ?? false,
        restrictedActions: [...GLOBAL_RESTRICTED_ACTIONS, ...(r.restricted_actions || [])],
        maxConfidenceThreshold: parseFloat(r.max_confidence_threshold) || 0.8,
        requireHumanReviewAboveRisk: r.require_human_review_above_risk || 'high',
        updatedAt: r.updated_at,
      };
    }
  } catch { /* table may not exist */ }

  // Default policy: observe + suggest, no execute
  return {
    moduleCode,
    allowObserve: true,
    allowSuggest: true,
    allowExecute: false,
    restrictedActions: [...GLOBAL_RESTRICTED_ACTIONS],
    maxConfidenceThreshold: 0.8,
    requireHumanReviewAboveRisk: 'high',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Set AI workflow policy for a module.
 */
export async function setWorkflowAiPolicy(
  tenantId: string,
  moduleCode: string,
  policy: Partial<Omit<WorkflowAiPolicy, 'moduleCode' | 'updatedAt'>>,
  updatedBy: string = 'system',
): Promise<WorkflowAiPolicy> {
  const schema = tenantSchema(tenantId);
  const current = await getWorkflowAiPolicy(tenantId, moduleCode);

  const merged = {
    allowObserve: policy.allowObserve ?? current.allowObserve,
    allowSuggest: policy.allowSuggest ?? current.allowSuggest,
    allowExecute: policy.allowExecute ?? current.allowExecute,
    restrictedActions: policy.restrictedActions ?? current.restrictedActions.filter(a => !GLOBAL_RESTRICTED_ACTIONS.includes(a)),
    maxConfidenceThreshold: policy.maxConfidenceThreshold ?? current.maxConfidenceThreshold,
    requireHumanReviewAboveRisk: policy.requireHumanReviewAboveRisk ?? current.requireHumanReviewAboveRisk,
  };

  await safeQuery(
    `INSERT INTO "${schema}".workflow_ai_policies
       (module_code, allow_observe, allow_suggest, allow_execute,
        restricted_actions, max_confidence_threshold, require_human_review_above_risk,
        updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (module_code) DO UPDATE SET
       allow_observe = $2, allow_suggest = $3, allow_execute = $4,
       restricted_actions = $5, max_confidence_threshold = $6,
       require_human_review_above_risk = $7, updated_by = $8, updated_at = NOW()`,
    [moduleCode, merged.allowObserve, merged.allowSuggest, merged.allowExecute,
     JSON.stringify(merged.restrictedActions), merged.maxConfidenceThreshold,
     merged.requireHumanReviewAboveRisk, updatedBy],
  ).catch((err) => {
    logger.warn('[AgentPolicy] Failed to save policy', { tenantId, moduleCode, error: (err as Error).message });
  });

  logger.info('[AgentPolicy] Policy updated', { tenantId, moduleCode, updatedBy });

  return { moduleCode, ...merged, updatedAt: new Date().toISOString() };
}

/**
 * Evaluate if an agent is eligible to handle a specific task type.
 */
export async function evaluateAgentEligibility(
  tenantId: string,
  agentId: string,
  moduleCode: string,
): Promise<AgentEligibility> {
  const policy = await getWorkflowAiPolicy(tenantId, moduleCode);

  // If module doesn't allow any AI, agent is ineligible
  if (!policy.allowObserve && !policy.allowSuggest && !policy.allowExecute) {
    return { allowed: false, reason: `Module '${moduleCode}' has all AI capabilities disabled`, capabilities: [] };
  }

  // Check agent exists and is active
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT id, status, capabilities FROM "${schema}".ai_agents WHERE id = $1 AND deleted_at IS NULL`,
    [agentId],
  ).catch(() => ({ rows: [] }));

  if (rows.length === 0) {
    // Try public registry
    const { rows: pubRows } = await safeQuery(
      `SELECT agent_id, status, capabilities FROM public.agent_registry WHERE agent_id = $1 AND is_active = TRUE`,
      [agentId],
    ).catch(() => ({ rows: [] }));

    if (pubRows.length === 0) {
      return { allowed: false, reason: 'Agent not found or inactive', capabilities: [] };
    }
  }

  const capabilities: string[] = [];
  if (policy.allowObserve) capabilities.push('observe');
  if (policy.allowSuggest) capabilities.push('suggest');
  if (policy.allowExecute) capabilities.push('execute');

  return { allowed: true, reason: 'Agent eligible', capabilities };
}

/**
 * Get list of globally and per-module restricted actions.
 */
export async function getRestrictedActions(tenantId: string, moduleCode?: string): Promise<string[]> {
  const restricted = [...GLOBAL_RESTRICTED_ACTIONS];

  if (moduleCode) {
    const policy = await getWorkflowAiPolicy(tenantId, moduleCode);
    restricted.push(...policy.restrictedActions.filter(a => !restricted.includes(a)));
  }

  return restricted;
}

/**
 * Get autonomy boundaries for a specific agent in a module context.
 */
export async function getAutonomyBoundaries(
  tenantId: string,
  agentId: string,
  moduleCode?: string,
): Promise<{
  canObserve: boolean;
  canSuggest: boolean;
  canExecute: boolean;
  restrictedActions: string[];
  confidenceThreshold: number;
  humanReviewRequired: boolean;
}> {
  let platformMode: string = 'manual';
  try {

    const { getTenantPlatformMode } = await import('../../@dos/platform-core/settings/platform-mode-gate.service');
    platformMode = await getTenantPlatformMode(tenantId);
  } catch { /* default manual */ }

  const policy = moduleCode ? await getWorkflowAiPolicy(tenantId, moduleCode) : null;

  const canObserve = platformMode !== 'manual' || true; // observe always allowed
  const canSuggest = platformMode === 'hybrid' || platformMode === 'autonomous';
  const canExecute = platformMode === 'autonomous' && (policy?.allowExecute ?? false);

  return {
    canObserve,
    canSuggest: canSuggest && (policy?.allowSuggest ?? true),
    canExecute,
    restrictedActions: await getRestrictedActions(tenantId, moduleCode),
    confidenceThreshold: policy?.maxConfidenceThreshold ?? 0.8,
    humanReviewRequired: platformMode !== 'autonomous',
  };
}

/**
 * Log a policy enforcement decision for audit.
 */
export async function logPolicyDecision(
  tenantId: string,
  agentId: string,
  action: string,
  allowed: boolean,
  reason: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail
       (tenant_id, user_id, module, action, entity_type, entity_id, after_state, created_at)
     VALUES ($1, $2, 'workflow', 'agent_policy_decision', 'agent', $3, $4::jsonb, NOW())`,
    [tenantId, `agent:${agentId}`, agentId,
     JSON.stringify({ action, allowed, reason, timestamp: new Date().toISOString() })],
  ).catch(catchHandler(EC.EVENT_BUS));
}
