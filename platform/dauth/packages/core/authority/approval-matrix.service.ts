/**
 * Approval Matrix Service — DAuth canonical approval rule engine
 *
 * Reads approval matrix rules and determines required approvers for actions.
 * Rules link action codes to required authority codes with optional value thresholds.
 *
 * Also provides authority-checking for lifecycle integration:
 *   - checkActorAuthority() is called by lifecycle-auth.service.ts during
 *     transition evaluation to verify the actor satisfies approval requirements.
 *
 * @owner DAuth
 */
import { safeQuery, tenantSchema } from '@dos/db';
import { publish } from '../events/publish-with-dsoc';
import { logger } from '@dos/platform-core/observability';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApprovalRule {
  ruleId: string;
  actionCode: string;
  moduleCode: string;
  requiredAuthorityCode: string;
  minApprovals: number;
  valueThreshold: number | null;
  isActive: boolean;
}

export interface RequiredApproval {
  authorityCode: string;
  minApprovals: number;
  valueThreshold: number | null;
}

export interface CreateApprovalRuleInput {
  actionCode: string;
  moduleCode: string;
  requiredAuthorityCode: string;
  minApprovals: number;
  valueThreshold?: number | null;
}

/** Result of checking whether an actor satisfies the approval matrix for a transition. */
export interface ApprovalMatrixCheckResult {
  /** Whether the actor can approve this transition. */
  canApprove: boolean;
  /** If approval is needed, which authority codes are required. */
  requiredApprovals: RequiredApproval[];
  /** The actor's authority codes (if any). */
  actorAuthorityCodes: string[];
  /** Reason string for audit logging. */
  reason: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapRow(r: any): ApprovalRule {
  return {
    ruleId: r.rule_id as string,
    actionCode: r.action_code as string,
    moduleCode: r.module_code as string,
    requiredAuthorityCode: r.required_authority_code as string,
    minApprovals: Number(r.min_approvals),
    valueThreshold: r.value_threshold != null ? Number(r.value_threshold) : null,
    isActive: r.is_active as boolean,
  };
}

// ---------------------------------------------------------------------------
// Rule CRUD
// ---------------------------------------------------------------------------

/** List approval rules, optionally filtered by module code. */
export async function getApprovalRules(tenantId: string, moduleCode?: string): Promise<ApprovalRule[]> {
  const schema = tenantSchema(tenantId);
  const filter = moduleCode ? `AND module_code = $1` : '';
  const params: unknown[] = moduleCode ? [moduleCode] : [];
  const { rows } = await safeQuery(
    `SELECT rule_id, action_code, module_code, required_authority_code, min_approvals, value_threshold, is_active
     FROM "${schema}".approval_matrix_rules
     WHERE is_active = TRUE ${filter}
     ORDER BY action_code, module_code`,
    params,
  );
  return rows.map(mapRow);
}

/** Lookup a single approval rule by ID. */
export async function getApprovalRule(tenantId: string, ruleId: string): Promise<ApprovalRule | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT rule_id, action_code, module_code, required_authority_code, min_approvals, value_threshold, is_active
     FROM "${schema}".approval_matrix_rules
     WHERE rule_id = $1`,
    [ruleId],
  );
  if (rows.length === 0) return null;
  return mapRow(rows[0]);
}

/** Create a new approval rule. */
export async function createApprovalRule(
  tenantId: string,
  input: CreateApprovalRuleInput,
  createdBy: string,
): Promise<ApprovalRule> {
  if (input.minApprovals < 1) {
    throw new Error('minApprovals must be at least 1.');
  }

  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".approval_matrix_rules
       (action_code, module_code, required_authority_code, min_approvals, value_threshold, is_active, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6, NOW(), NOW())
     RETURNING rule_id, action_code, module_code, required_authority_code, min_approvals, value_threshold, is_active`,
    [
      input.actionCode,
      input.moduleCode,
      input.requiredAuthorityCode,
      input.minApprovals,
      input.valueThreshold ?? null,
      createdBy,
    ],
  );

  const rule = mapRow(rows[0]);
  publish('dauth.approval-rule.created', tenantId, { ruleId: rule.ruleId, actionCode: rule.actionCode, createdBy });
  logger.info(`Approval rule created: ${rule.ruleId} for ${rule.actionCode}/${rule.moduleCode} by ${createdBy}`);
  return rule;
}

/** Soft-deactivate an approval rule. */
export async function deactivateApprovalRule(
  tenantId: string,
  ruleId: string,
  deactivatedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const existing = await getApprovalRule(tenantId, ruleId);
  if (!existing) {
    throw new Error(`Approval rule "${ruleId}" not found.`);
  }

  await safeQuery(
    `UPDATE "${schema}".approval_matrix_rules
     SET is_active = FALSE, updated_at = NOW()
     WHERE rule_id = $1`,
    [ruleId],
  );

  publish('dauth.approval-rule.deactivated', tenantId, { ruleId, deactivatedBy });
  logger.info(`Approval rule deactivated: ${ruleId} by ${deactivatedBy}`);
}

// ---------------------------------------------------------------------------
// Approval resolution
// ---------------------------------------------------------------------------

/** Quick check whether any active approval rule exists for the given action and module. */
export async function isApprovalRequired(
  tenantId: string,
  action: string,
  moduleCode: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT 1 FROM "${schema}".approval_matrix_rules
     WHERE action_code = $1 AND module_code = $2 AND is_active = TRUE
     LIMIT 1`,
    [action, moduleCode],
  );
  return rows.length > 0;
}

/**
 * Determine the required approvers for an action.
 *
 * Looks up all active rules matching the action and module code.
 * If entityValue is provided, only rules whose value_threshold is NULL
 * or <= entityValue are returned (escalation-style filtering).
 */
export async function getRequiredApprovers(
  tenantId: string,
  action: string,
  moduleCode: string,
  entityValue?: number,
): Promise<RequiredApproval[]> {
  const schema = tenantSchema(tenantId);

  const thresholdFilter = entityValue != null
    ? `AND (value_threshold IS NULL OR value_threshold <= $3)`
    : '';
  const params: unknown[] = entityValue != null
    ? [action, moduleCode, entityValue]
    : [action, moduleCode];

  const { rows } = await safeQuery(
    `SELECT required_authority_code, min_approvals, value_threshold
     FROM "${schema}".approval_matrix_rules
     WHERE action_code = $1 AND module_code = $2 AND is_active = TRUE ${thresholdFilter}
     ORDER BY value_threshold DESC NULLS LAST`,
    params,
  );

  return rows.map((r: any) => ({
    authorityCode: r.required_authority_code as string,
    minApprovals: Number(r.min_approvals),
    valueThreshold: r.value_threshold != null ? Number(r.value_threshold) : null,
  }));
}

// ---------------------------------------------------------------------------
// Lifecycle integration — actor authority check
// ---------------------------------------------------------------------------

/**
 * Check whether an actor satisfies the approval matrix for a given transition action.
 *
 * Called by lifecycle-auth.service.ts when a transition has `requires_approval = true`.
 * Looks up all approval_matrix_rules for the action+module pair, then checks
 * whether the actor holds any of the required authority codes.
 *
 * @param tenantId  - Tenant identifier
 * @param userId    - The actor attempting the transition
 * @param action    - The action code (e.g. 'risk.approve', 'policy.publish')
 * @param moduleCode - Module code
 * @param entityValue - Optional monetary/impact value for threshold-based escalation
 */
export async function checkActorAuthority(
  tenantId: string,
  userId: string,
  action: string,
  moduleCode: string,
  entityValue?: number,
): Promise<ApprovalMatrixCheckResult> {
  const requiredApprovals = await getRequiredApprovers(tenantId, action, moduleCode, entityValue);

  // No approval rules configured — approval is not gated by the matrix
  if (requiredApprovals.length === 0) {
    return {
      canApprove: true,
      requiredApprovals: [],
      actorAuthorityCodes: [],
      reason: 'No approval matrix rules configured for this action',
    };
  }

  // Resolve the actor's authority codes
  const schema = tenantSchema(tenantId);
  const { rows: authorityRows } = await safeQuery(
    `SELECT DISTINCT ura.authority_level_code
     FROM "${schema}".user_role_assignments ura
     WHERE ura.user_id = $1 AND ura.is_active = TRUE
       AND ura.authority_level_code IS NOT NULL`,
    [userId],
  );
  const actorAuthorityCodes = authorityRows.map((r: any) => r.authority_level_code as string);

  // Check if the actor holds any of the required authority codes
  const satisfied = requiredApprovals.some(
    req => actorAuthorityCodes.includes(req.authorityCode),
  );

  if (satisfied) {
    return {
      canApprove: true,
      requiredApprovals,
      actorAuthorityCodes,
      reason: 'Actor holds required approval authority',
    };
  }

  return {
    canApprove: false,
    requiredApprovals,
    actorAuthorityCodes,
    reason: `Actor lacks required authority. Needed: ${requiredApprovals.map(r => r.authorityCode).join(', ')}. Has: ${actorAuthorityCodes.join(', ') || 'none'}`,
  };
}
