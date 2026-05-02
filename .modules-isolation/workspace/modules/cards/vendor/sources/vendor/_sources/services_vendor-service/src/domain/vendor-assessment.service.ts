import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';
import { recordAudit } from '../adapters/audit.adapter';
import { publishDomainEvent } from '../events/publisher';
import * as vendorService from './vendor.service';

/**
 * Vendor assessment orchestrator — drives vendor.status transitions through
 * the lifecycle defined in modules/vendor/.../lifecycle-registration.ts.
 * Same pattern as policy-state-machine: validates transition, updates DB,
 * writes audit, publishes domain event. SoD enforcement happens at the
 * route layer.
 */

export const VENDOR_STATES = [
  'identified', 'questionnaire_sent', 'questionnaire_received', 'assessing',
  'assessed', 'approved', 'rejected', 'onboarded', 'active',
  'annual_review', 're_assessed', 'offboarding', 'offboarded',
] as const;

export const VENDOR_TRANSITIONS: Record<string, readonly string[]> = {
  identified:              ['questionnaire_sent'],
  questionnaire_sent:      ['questionnaire_received'],
  questionnaire_received:  ['assessing'],
  assessing:               ['assessed'],
  assessed:                ['approved', 'rejected'],
  approved:                ['onboarded'],
  rejected:                [],
  onboarded:               ['active'],
  active:                  ['annual_review', 'offboarding'],
  annual_review:           ['re_assessed'],
  re_assessed:             ['active', 'offboarding'],
  offboarding:             ['offboarded'],
  offboarded:              [],
};

export type VendorState = (typeof VENDOR_STATES)[number];

export interface VendorTransitionResult {
  vendorId: string;
  fromState: VendorState;
  toState: VendorState;
  actorId: string;
  occurredAt: string;
}

export class IllegalVendorTransitionError extends Error {
  constructor(public readonly fromState: string, public readonly toState: string) {
    super(`Illegal vendor state transition: ${fromState} -> ${toState}`);
    this.name = 'IllegalVendorTransitionError';
  }
}

export class VendorNotFoundError extends Error {
  constructor(public readonly vendorId: string) {
    super(`Vendor not found: ${vendorId}`);
    this.name = 'VendorNotFoundError';
  }
}

// SoD note: vendor SoD enforcement deferred. dos.vendors lacks a creator/
// owner column the service exposes today, so same-actor SoD must be derived
// from the audit-trail (look up actor of prior 'vendor.transition.assessed'
// audit row and reject if equal). Tracked as next-iteration hardening — see
// project_g1_g5_execution memory for context. Until then, RBAC alone gates
// approve/reject (vendor.approve permission required).

function assertReachable(from: string, to: string): void {
  const allowed = VENDOR_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new IllegalVendorTransitionError(from, to);
  }
}

async function transition(
  tenantId: string,
  vendorId: string,
  toState: VendorState,
  actorId: string,
  context: Record<string, unknown> = {},
): Promise<VendorTransitionResult> {
  const vendor = await vendorService.getById(tenantId, vendorId);
  if (!vendor) throw new VendorNotFoundError(vendorId);

  const fromState = (vendor.status || 'identified') as VendorState;
  assertReachable(fromState, toState);

  try {
    await safeQuery(
      `UPDATE dos.vendors SET status = $3, updated_at = NOW() WHERE tenant_id = $1 AND vendor_id = $2 AND deleted_at IS NULL`,
      [tenantId, vendorId, toState],
    );
  } catch (err) {
    logger.error('[vendor-assessment] DB update failed', {
      tenantId, vendorId, fromState, toState, error: toErrorMessage(err),
    });
    throw err;
  }

  const occurredAt = new Date().toISOString();

  recordAudit(tenantId, `vendor.transition.${toState}`, 'vendor', vendorId, actorId, {
    fromState, toState, ...context,
  }).catch((err) => logger.warn('[vendor-assessment] audit write failed', { vendorId, error: toErrorMessage(err) }));

  publishDomainEvent(`vendor.${toState}`, {
    entityId: vendorId, fromState, toState, actorId, ...context,
  }, tenantId, actorId).catch((err) =>
    logger.warn('[vendor-assessment] event publish failed', { vendorId, error: toErrorMessage(err) }),
  );

  logger.info('[vendor-assessment] transition', { tenantId, vendorId, fromState, toState, actorId });
  return { vendorId, fromState, toState, actorId, occurredAt };
}

// Public surface
export const sendQuestionnaire = (t: string, v: string, a: string) =>
  transition(t, v, 'questionnaire_sent', a);
export const receiveQuestionnaire = (t: string, v: string, a: string, payload?: Record<string, unknown>) =>
  transition(t, v, 'questionnaire_received', a, { payload });
export const startAssessment = (t: string, v: string, a: string) =>
  transition(t, v, 'assessing', a);
export const completeAssessment = (t: string, v: string, a: string, score?: number) =>
  transition(t, v, 'assessed', a, { score });
export const approve = (t: string, v: string, a: string, note?: string) =>
  transition(t, v, 'approved', a, { note });
export const reject = (t: string, v: string, a: string, reason?: string) =>
  transition(t, v, 'rejected', a, { reason });
export const onboard = (t: string, v: string, a: string) =>
  transition(t, v, 'onboarded', a);
export const activate = (t: string, v: string, a: string) =>
  transition(t, v, 'active', a);
export const startAnnualReview = (t: string, v: string, a: string) =>
  transition(t, v, 'annual_review', a);
export const completeReassessment = (t: string, v: string, a: string, score?: number) =>
  transition(t, v, 're_assessed', a, { score });
export const startOffboarding = (t: string, v: string, a: string, reason?: string) =>
  transition(t, v, 'offboarding', a, { reason });
export const completeOffboarding = (t: string, v: string, a: string) =>
  transition(t, v, 'offboarded', a);

export async function getCurrentState(tenantId: string, vendorId: string): Promise<VendorState | null> {
  const vendor = await vendorService.getById(tenantId, vendorId);
  return vendor ? (vendor.status as VendorState) : null;
}

export function getReachableStates(fromState: VendorState): VendorState[] {
  return [...(VENDOR_TRANSITIONS[fromState] ?? [])] as VendorState[];
}
