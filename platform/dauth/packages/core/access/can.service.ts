/**
 * DAuth unified `can()` API.
 *
 * Single high-level entrypoint for authorization decisions. Wraps the 14-step
 * `evaluateAccess` pipeline so callers do not have to assemble an
 * `AccessDecisionContext` by hand, and so the shape of the decision response
 * matches what the decision ledger and frontend obligation handlers expect.
 *
 * Callers pass a natural `{ principal, action, resource, context }` envelope.
 * The service translates it into the internal pipeline context, runs
 * `evaluateAccess`, and returns a caller-friendly verdict plus a decision id
 * that can be handed to `diagnostics.explainDecision` for debugging.
 */
import { randomUUID } from 'node:crypto';
import {
  evaluateAccess,
  type AccessDecisionContext,
  type AccessDecision,
} from './decision-engine';
import { DAUTH_REASON_CODES } from '../contracts/reason-codes';

export interface CanInput {
  tenantId: string;
  userId: string;
  /** Action code, e.g. `evidence.approve`, `onboarding.invite`. */
  action: string;

  /** Resource under test. `type` is required; id/attrs forwarded to PDPs. */
  resource?: {
    type: string;
    id?: string;
    tenantId?: string;
    createdBy?: string;
    status?: string;
    attributes?: Record<string, unknown>;
  };

  /** Contextual attributes — emailVerified, workflowState, ip, userAgent, etc. */
  context?: Record<string, unknown>;

  /** Runtime hints — usually supplied by the middleware layer. */
  role?: string;
  roles?: string[];
  isSuperAdmin?: boolean;

  /** Scope hints — forwarded to Step 9. */
  scopeType?: string;
  scopeId?: string;

  /** Authority level required — forwarded to Step 10. */
  authorityRequired?: string;

  /** Lifecycle transition hints — forwarded to Step 12. */
  lifecycleFromState?: string;
  lifecycleToState?: string;

  /** When true, enforce entity ownership in Step 13. */
  ownershipRequired?: boolean;

  /** When true, run the pipeline without writing to the ledger. */
  dryRun?: boolean;

  /** Correlation id that ties this check to a request chain. */
  correlationId?: string;
}

export interface CanDecision {
  allowed: boolean;
  /** Unique id for this decision — used by `explainDecision`. */
  decisionId: string;
  /** Canonical reason codes — always at least one entry. */
  reasonCodes: string[];
  /** Free-form human-readable reason. */
  reason: string;
  /** Obligations the caller must honor (e.g. `{ requireDualApproval: true }`). */
  obligations: Record<string, unknown>;
  /** Policy/model versions stamped on the decision for replay. */
  policyVersion?: string;
  modelVersion?: string;
  /** Raw engine-level verdicts (shadow/enforce adapters) — diagnostic only. */
  engineResults?: Record<string, unknown>;
  /** Full 14-step trace when a verbose output is requested. */
  steps?: AccessDecision['steps'];
}

export interface CanOptions {
  /** Include the full 14-step trace in the result. Defaults to false. */
  verbose?: boolean;
}

/**
 * Evaluate whether a principal can perform an action on a resource.
 *
 * This is the single entrypoint callers should use — everything else in
 * `access/*` is either (a) a primitive the engine builds on or (b) a legacy
 * API kept for backward compatibility while existing call sites migrate.
 */
export async function can(input: CanInput, opts: CanOptions = {}): Promise<CanDecision> {
  const correlationId = input.correlationId ?? randomUUID();
  const decisionId = randomUUID();

  // Merge resource + free-form context into a single attributes map so
  // external PDPs (Cerbos/OPA) receive everything under one key.
  const attributes: Record<string, unknown> = {
    ...(input.context ?? {}),
  };
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

  const pipelineCtx: AccessDecisionContext = {
    userId: input.userId,
    tenantId: input.tenantId,
    role: input.role ?? (input.roles?.[0] ?? ''),
    roles: input.roles,
    isSuperAdmin: input.isSuperAdmin,
    permissionCode: input.action,
    moduleCode: deriveModule(input.action),
    scopeType: input.scopeType,
    scopeId: input.scopeId,
    authorityRequired: input.authorityRequired,
    lifecycleFromState: input.lifecycleFromState,
    lifecycleToState: input.lifecycleToState,
    entityType: input.resource?.type,
    entityId: input.resource?.id,
    ownershipRequired: input.ownershipRequired,
    ip: pickString(input.context, 'ip'),
    path: pickString(input.context, 'path'),
    attributes,
    correlationId,
    dryRun: input.dryRun,
  };

  const decision = await evaluateAccess(pipelineCtx);

  const reasonCodes: string[] = [];
  if (decision.reasonCode) reasonCodes.push(decision.reasonCode);
  if (reasonCodes.length === 0) {
    reasonCodes.push(
      decision.allowed
        ? DAUTH_REASON_CODES.ALLOW_ALL_CHECKS_PASSED
        : DAUTH_REASON_CODES.INTERNAL_UNKNOWN,
    );
  }

  return {
    allowed: decision.allowed,
    decisionId,
    reasonCodes,
    reason: decision.reason,
    obligations: decision.obligations ?? {},
    policyVersion: decision.policyVersion,
    modelVersion: decision.modelVersion,
    engineResults: decision.engineResults,
    ...(opts.verbose ? { steps: decision.steps } : {}),
  };
}

function deriveModule(action: string): string {
  const dot = action.indexOf('.');
  if (dot > 0) return action.slice(0, dot);
  const colon = action.indexOf(':');
  if (colon > 0) return action.slice(0, colon);
  return action;
}

function pickString(ctx: Record<string, unknown> | undefined, key: string): string | undefined {
  const v = ctx?.[key];
  return typeof v === 'string' ? v : undefined;
}
