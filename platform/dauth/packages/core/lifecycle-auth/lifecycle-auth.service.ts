/**
 * DAuth LifecycleAuthService — canonical lifecycle authorization.
 * §11: Permission is necessary but not sufficient for state transitions.
 * Law 5: One engine, parameterized by entity/module — not per-module copies.
 *
 * Reads registered lifecycle definitions from DOS generic FSM
 * (platform/state-machine/entity-state-machine.ts).
 *
 * Integration chain:
 *   lifecycle-auth → self-approval.guard (§9.1 self-approval prevention)
 *   lifecycle-auth → sod-engine (SoD check)
 *   lifecycle-auth → approval-matrix.service (approval authority check)
 */
import { safeQuery, tenantSchema } from '@dos/db';
import { evaluateSod } from '../sod/sod-engine';
import { checkActorAuthority } from '../authority/approval-matrix.service';
import { checkSelfApproval } from './self-approval.guard';

export interface LifecycleAuthResult {
  allowed: boolean;
  reason: string;
  checks: {
    permissionValid: boolean;
    transitionValid: boolean;
    authorityValid: boolean;
    ownershipValid: boolean;
    sodValid: boolean;
    approvalRequired: boolean;
    /** When approvalRequired=true, indicates if the actor can approve directly. */
    approvalSatisfied: boolean;
  };
  /** Required authority codes when approval is needed but actor cannot approve. */
  requiredApprovalAuthorities?: string[];
}

/**
 * Evaluate whether an actor can perform a lifecycle state transition.
 * §11.2 inputs: current state, target state, module/entity type, permission,
 * decision authority, ownership, approval matrix, SoD, delegation, escalation.
 */
export async function evaluateLifecycleTransition(
  tenantId: string,
  userId: string,
  opts: {
    moduleCode: string;
    entityType: string;
    entityId: string;
    fromState: string;
    toState: string;
    permissionCode: string;
    userRoles: string[];
    authorityLevelCode?: string;
    ownerId?: string;
    /** Optional entity value for threshold-based approval escalation. */
    entityValue?: number;
  },
): Promise<LifecycleAuthResult> {
  const schema = tenantSchema(tenantId);
  const checks = {
    permissionValid: false,
    transitionValid: false,
    authorityValid: false,
    ownershipValid: false,
    sodValid: false,
    approvalRequired: false,
    approvalSatisfied: false,
  };

  // 1. Check transition is defined
  const transition = await safeQuery(
    `SELECT required_permission_code, authority_gate, sod_check, required_functional_roles
     FROM "${schema}".module_lifecycle_transitions
     WHERE module_code = $1 AND from_status = $2 AND to_status = $3 LIMIT 1`,
    [opts.moduleCode, opts.fromState, opts.toState],
  );
  if (transition.rows.length === 0) {
    return { allowed: false, reason: `Transition ${opts.fromState} → ${opts.toState} not defined for ${opts.moduleCode}`, checks };
  }
  checks.transitionValid = true;
  const rule = transition.rows[0];

  // 2. Check permission
  const requiredPerm = rule.required_permission_code || opts.permissionCode;
  const permCheck = await safeQuery(
    `SELECT 1 FROM "${schema}".role_permissions rp
     JOIN "${schema}".functional_roles fr ON fr.id = rp.functional_role_id
     JOIN "${schema}".permissions p ON p.id = rp.permission_id
     WHERE fr.code = ANY($1) AND p.code = $2 AND fr.is_active = TRUE LIMIT 1`,
    [opts.userRoles, requiredPerm],
  );
  checks.permissionValid = permCheck.rows.length > 0;
  if (!checks.permissionValid) {
    return { allowed: false, reason: `No role grants permission ${requiredPerm}`, checks };
  }

  // 3. Check authority
  if (rule.authority_gate) {
    const authCheck = await safeQuery(
      `SELECT al.rank FROM "${schema}".authority_levels al
       JOIN "${schema}".user_role_assignments ura ON ura.authority_level_code = al.level_code
       WHERE ura.user_id = $1 AND ura.is_active = TRUE ORDER BY al.rank DESC LIMIT 1`,
      [userId],
    );
    const requiredAuth = await safeQuery(
      `SELECT rank FROM "${schema}".authority_levels WHERE level_code = $1 LIMIT 1`,
      [rule.authority_gate],
    );
    const userRank = authCheck.rows[0]?.rank ?? 0;
    const needRank = requiredAuth.rows[0]?.rank ?? 999;
    checks.authorityValid = userRank >= needRank;
    if (!checks.authorityValid) {
      return { allowed: false, reason: `Authority insufficient (${userRank} < ${needRank})`, checks };
    }
  } else {
    checks.authorityValid = true;
  }

  // 4. Self-approval prevention via canonical guard (§9.1)
  // The guard checks tenant policy, then verifies submitter_id !== approver_id
  // by querying the entity's created_by column (or using the provided ownerId).
  if (rule.sod_check) {
    // Fast path: caller provided ownerId and it matches the actor
    if (opts.ownerId && opts.ownerId === userId) {
      checks.ownershipValid = false;
      return { allowed: false, reason: 'Cannot approve own submission (§9.1 self-approval prevention)', checks };
    }
    // Full guard path: queries DB for entity creator, checks tenant policy,
    // and logs the denial to the DAuth decision log for audit trail.
    const selfApprovalCheck = await checkSelfApproval(
      tenantId,
      userId,
      opts.entityType,
      opts.entityId,
      opts.toState,
    );
    if (!selfApprovalCheck.allowed) {
      checks.ownershipValid = false;
      return { allowed: false, reason: 'Cannot approve own submission (§9.1 self-approval prevention)', checks };
    }
  }
  checks.ownershipValid = true;

  // 5. SoD check
  const sodResult = await evaluateSod(tenantId, opts.userRoles, { moduleCode: opts.moduleCode });
  checks.sodValid = sodResult.passed;
  if (!checks.sodValid) {
    return { allowed: false, reason: `SoD violation: ${sodResult.violations[0]?.roleA} vs ${sodResult.violations[0]?.roleB}`, checks };
  }

  // 6. Approval matrix integration
  checks.approvalRequired = !!rule.authority_gate;

  if (checks.approvalRequired) {
    // Derive the action code for the approval matrix lookup.
    // Convention: <moduleCode>.<entityType>.transition or the transition's toState action.
    const transitionAction = `${opts.moduleCode}.${opts.entityType}.${opts.toState}`;

    const approvalCheck = await checkActorAuthority(
      tenantId,
      userId,
      transitionAction,
      opts.moduleCode,
      opts.entityValue,
    );

    checks.approvalSatisfied = approvalCheck.canApprove;

    if (!approvalCheck.canApprove) {
      return {
        allowed: false,
        reason: `Approval required: ${approvalCheck.reason}`,
        checks,
        requiredApprovalAuthorities: approvalCheck.requiredApprovals.map(r => r.authorityCode),
      };
    }

    // Actor can approve — transition allowed
    return {
      allowed: true,
      reason: 'All lifecycle checks passed (actor satisfies approval matrix)',
      checks,
    };
  }

  return {
    allowed: true,
    reason: 'All lifecycle checks passed',
    checks,
  };
}
