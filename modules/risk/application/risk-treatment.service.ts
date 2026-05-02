import { safeQuery, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';
import { publishEvent } from '@dos/module-sdk';
import { recordAudit } from '../infrastructure/adapters/audit.adapter';
import * as riskService from './risk.service';

/**
 * Risk treatment orchestrator — drives risk.status transitions through the
 * lifecycle defined in modules/risk/.../workflows/risk-lifecycle.ts and the
 * service-side EntityStateMachine in domain/risk/lifecycle-registration.ts.
 *
 * Mirrors the policy/vendor pattern: validate → DB update → audit → publish.
 * SoD enforcement applied at the route layer.
 */

export const RISK_STATES = [
  'draft', 'submitted', 'under_review', 'assessed', 'treatment_planned',
  'approved', 'active', 'monitoring', 'closed', 'retired', 'returned',
  'identified', 'mitigating', 'accepted', 'archived',
] as const;

export const RISK_TRANSITIONS: Record<string, readonly string[]> = {
  draft:             ['submitted', 'identified'],
  submitted:         ['under_review'],
  under_review:      ['returned', 'assessed'],
  returned:          ['submitted'],
  assessed:          ['treatment_planned', 'active'],
  treatment_planned: ['approved'],
  approved:          ['active'],
  active:            ['monitoring', 'mitigating', 'assessed'],
  monitoring:        ['closed'],
  closed:            ['active', 'archived'],
  retired:           [],
  identified:        ['assessed'],
  mitigating:        ['accepted', 'active'],
  accepted:          ['closed'],
  archived:          [],
};

export type RiskState = (typeof RISK_STATES)[number];
export type RiskTreatmentType = 'mitigate' | 'transfer' | 'accept' | 'avoid';

export interface RiskTransitionResult {
  riskId: string;
  fromState: RiskState;
  toState: RiskState;
  actorId: string;
  occurredAt: string;
}

export class IllegalRiskTransitionError extends Error {
  constructor(public readonly fromState: string, public readonly toState: string) {
    super(`Illegal risk state transition: ${fromState} -> ${toState}`);
    this.name = 'IllegalRiskTransitionError';
  }
}

export class RiskNotFoundError extends Error {
  constructor(public readonly riskId: string) {
    super(`Risk not found: ${riskId}`);
    this.name = 'RiskNotFoundError';
  }
}

function assertReachable(from: string, to: string): void {
  const allowed = RISK_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new IllegalRiskTransitionError(from, to);
  }
}

async function transition(
  tenantId: string,
  riskId: string,
  toState: RiskState,
  actorId: string,
  context: Record<string, unknown> = {},
): Promise<RiskTransitionResult> {
  const risk = await riskService.getById(tenantId, riskId);
  if (!risk) throw new RiskNotFoundError(riskId);

  const fromState = (risk.status || 'draft') as RiskState;
  assertReachable(fromState, toState);

  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `UPDATE "${schema}"."risks" SET status = $3, updated_at = NOW() WHERE tenant_id = $1 AND risk_id = $2`,
      [tenantId, riskId, toState],
    );
  } catch (err) {
    logger.error('[risk-treatment] DB update failed', {
      tenantId, riskId, fromState, toState, error: toErrorMessage(err),
    });
    throw err;
  }

  const occurredAt = new Date().toISOString();

  recordAudit(tenantId, `risk.transition.${toState}`, 'risk', riskId, actorId, {
    fromState, toState, ...context,
  }).catch((err) => logger.warn('[risk-treatment] audit write failed', { riskId, error: toErrorMessage(err) }));

  publishEvent({
    eventType: `risk.${toState}`,
    tenantId,
    sourceService: 'risk',
    entityType: 'risk',
    entityId: riskId,
    severity: toState === 'mitigating' || toState === 'accepted' ? 'warning' : 'info',
    payload: { riskId, fromState, toState, actorId, ...context },
  } as any).catch((err) => logger.warn('[risk-treatment] event publish failed', { riskId, error: toErrorMessage(err) }));

  if (toState === 'mitigating' || toState === 'closed' || toState === 'accepted') {
    publishEvent({
      eventType: 'risk.mitigated',
      tenantId,
      sourceService: 'risk',
      entityType: 'risk',
      entityId: riskId,
      severity: 'info',
      payload: { riskId, fromState, toState, actorId, ...context },
    } as any).catch(() => {});
  }

  logger.info('[risk-treatment] transition', { tenantId, riskId, fromState, toState, actorId });
  return { riskId, fromState, toState, actorId, occurredAt };
}

// Public surface
export const submit = (t: string, r: string, a: string) =>
  transition(t, r, 'submitted', a);
export const review = (t: string, r: string, a: string) =>
  transition(t, r, 'under_review', a);
export const returnForRevision = (t: string, r: string, a: string, reason?: string) =>
  transition(t, r, 'returned', a, { reason });
export const assess = (t: string, r: string, a: string, score?: number) =>
  transition(t, r, 'assessed', a, { score });
export const planTreatment = (
  t: string, r: string, a: string, treatmentType: RiskTreatmentType, plan?: string,
) => transition(t, r, 'treatment_planned', a, { treatmentType, plan });
export const approveTreatment = (t: string, r: string, a: string, note?: string) =>
  transition(t, r, 'approved', a, { note });
export const activate = (t: string, r: string, a: string) =>
  transition(t, r, 'active', a);
export const startMonitoring = (t: string, r: string, a: string) =>
  transition(t, r, 'monitoring', a);
export const startMitigation = (t: string, r: string, a: string) =>
  transition(t, r, 'mitigating', a);
export const recordAcceptance = (
  t: string, r: string, a: string, signoffActorId: string, rationale?: string,
) => transition(t, r, 'accepted', a, { signoffActorId, rationale });
export const close = (t: string, r: string, a: string, reason?: string) =>
  transition(t, r, 'closed', a, { reason });
export const archive = (t: string, r: string, a: string) =>
  transition(t, r, 'archived', a);

export async function getCurrentState(tenantId: string, riskId: string): Promise<RiskState | null> {
  const risk = await riskService.getById(tenantId, riskId);
  return risk ? (risk.status as RiskState) : null;
}

export function getReachableStates(fromState: RiskState): RiskState[] {
  return [...(RISK_TRANSITIONS[fromState] ?? [])] as RiskState[];
}
