/**
 * Policy simulator — dry-run `can()` without touching the decision ledger
 * or emitting side-effect events. Intended for the DAuth Admin Studio to
 * answer "if I grant this user role X, what will they be able to do?".
 *
 * Two entry points:
 *   - `simulateCan(input)` — one decision, returns full trace + reasons.
 *   - `simulateRoleGrant({ userId, tenantId, roles, actions })` —
 *     N decisions, one per action, with the given role set substituted in.
 *
 * Implementation approach: reuse `evaluateAccess` with `dryRun: true`. This
 * avoids duplicating the 14-step pipeline and guarantees simulations produce
 * the same verdicts as real calls.
 */
import { randomUUID } from 'node:crypto';
import {
  evaluateAccess,
  type AccessDecisionContext,
  type AccessDecision,
} from '../access/decision-engine';
import { DAUTH_CONFIG } from '../dauth.config';

export interface SimulateCanInput {
  tenantId: string;
  userId: string;
  action: string;
  /** Role set to substitute — defaults to the user's current roles. */
  roles?: string[];
  /** Override attributes for the simulation. */
  attributes?: Record<string, unknown>;
  /** Optional resource context. */
  resource?: {
    type: string;
    id?: string;
    tenantId?: string;
    createdBy?: string;
    status?: string;
    attributes?: Record<string, unknown>;
  };
  scopeType?: string;
  scopeId?: string;
  authorityRequired?: string;
  lifecycleFromState?: string;
  lifecycleToState?: string;
  ownershipRequired?: boolean;
}

export interface SimulateCanResult {
  decisionId: string;
  allowed: boolean;
  reasonCode?: string;
  reason: string;
  steps: AccessDecision['steps'];
  engineResults?: Record<string, unknown>;
  obligations?: Record<string, unknown>;
  policyVersion?: string;
  modelVersion?: string;
  /** Indicates the simulation did not write to the ledger. */
  wroteLedger: false;
}

export async function simulateCan(input: SimulateCanInput): Promise<SimulateCanResult> {
  if (!DAUTH_CONFIG.policySimulation.enabled) {
    throw new Error('[DAuth:Simulator] disabled via DAUTH_POLICY_SIMULATION_ENABLED=false');
  }
  const decisionId = randomUUID();

  const attributes: Record<string, unknown> = { ...(input.attributes ?? {}) };
  if (input.resource) {
    attributes.resource = {
      type: input.resource.type,
      id: input.resource.id,
      tenantId: input.resource.tenantId ?? input.tenantId,
      createdBy: input.resource.createdBy,
      status: input.resource.status,
      ...(input.resource.attributes ?? {}),
    };
  }

  const ctx: AccessDecisionContext = {
    userId: input.userId,
    tenantId: input.tenantId,
    role: input.roles?.[0] ?? '',
    roles: input.roles,
    permissionCode: input.action,
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    authorityRequired: input.authorityRequired,
    lifecycleFromState: input.lifecycleFromState,
    lifecycleToState: input.lifecycleToState,
    entityType: input.resource?.type,
    entityId: input.resource?.id,
    ownershipRequired: input.ownershipRequired,
    attributes,
    dryRun: true,
    correlationId: `sim:${decisionId}`,
  };

  const decision = await evaluateAccess(ctx);
  return {
    decisionId,
    allowed: decision.allowed,
    reasonCode: decision.reasonCode,
    reason: decision.reason,
    steps: decision.steps,
    engineResults: decision.engineResults,
    obligations: decision.obligations,
    policyVersion: decision.policyVersion,
    modelVersion: decision.modelVersion,
    wroteLedger: false,
  };
}

export interface SimulateRoleGrantInput {
  tenantId: string;
  userId: string;
  roles: string[];
  actions: string[];
}

export interface SimulateRoleGrantResult {
  tenantId: string;
  userId: string;
  roles: string[];
  perAction: Array<{
    action: string;
    allowed: boolean;
    reasonCode?: string;
    reason: string;
  }>;
  summary: { allowed: number; denied: number };
}

export async function simulateRoleGrant(
  input: SimulateRoleGrantInput,
): Promise<SimulateRoleGrantResult> {
  const perAction: SimulateRoleGrantResult['perAction'] = [];
  let allowed = 0;
  let denied = 0;
  for (const action of input.actions) {
    const r = await simulateCan({
      tenantId: input.tenantId,
      userId: input.userId,
      action,
      roles: input.roles,
    });
    perAction.push({
      action,
      allowed: r.allowed,
      reasonCode: r.reasonCode,
      reason: r.reason,
    });
    if (r.allowed) allowed++;
    else denied++;
  }
  return {
    tenantId: input.tenantId,
    userId: input.userId,
    roles: input.roles,
    perAction,
    summary: { allowed, denied },
  };
}
