/**
 * Port-aware ReBAC check + ledger write.
 *
 * Callers (auth-service / gateway / any future guard) invoke
 * `checkRebacAndLog()` with a user/relation/object triple plus any DAuth
 * context. The function:
 *   1. Resolves the current ReBAC adapter via the factory (native by
 *      default, OpenFGA when `DAUTH_OPENFGA_ENFORCE=true`).
 *   2. Invokes check() on the primary.
 *   3. Optionally invokes check() on the shadow and logs divergence.
 *   4. Writes a row to `platform_dauth.authz_decision_log` with
 *      `engine_results.openfga = { allowed, modelVersion, latencyMs, trace }`
 *      so explainDecision / replay can see what OpenFGA said.
 *   5. Returns the final verdict the caller should act on.
 *
 * Ledger write uses `writeAuthDecision()` from `./audit/decision-ledger`.
 */
import type { SqlClient, WriteDecisionInput } from '../audit/decision-ledger';
import { writeAuthDecision } from '../audit/decision-ledger';
import { getRebacAdapter } from '../rebac-factory';
import type { RebacCheckResult } from '../dauth-ports/rebac.port';

export interface CheckRebacAndLogInput {
  tenantId: string;
  userId: string;
  /** OpenFGA object, e.g. "tenant:abc123", "evidence:e1". */
  object: string;
  /** OpenFGA relation, e.g. "member", "owner", "can_approve". */
  relation: string;
  /** Optional action label emitted to the ledger (defaults to relation). */
  action?: string;
  /** Additional metadata folded into the ledger row. */
  correlationId?: string;
  requestPath?: string;
  requestMethod?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  /**
   * Optional SoD pairing. When the relation is one of the SoD-bound
   * relations (can_approve, can_sign_off, can_publish, can_close), the
   * caller may supply this guard so we run a tenant-side SoD evaluator
   * after OpenFGA returns allow. A blocking SoD verdict overrides allow
   * and adds an `engineResults.sod` bucket so divergence-report sees it.
   */
  sodGuard?: SodGuardEvaluator;
}

/**
 * SoD evaluator called by checkRebacAndLog when the relation is SoD-bound
 * AND OpenFGA returned allow. Implementations live in services that have
 * DB access; pass a closure to keep this module DB-free.
 */
export type SodGuardEvaluator = (input: {
  tenantId: string;
  userId: string;
  object: string;
  relation: string;
}) => Promise<SodGuardResult>;

export interface SodGuardResult {
  allowed: boolean;
  outcome: 'allow' | 'warn' | 'escalate' | 'block' | 'allow-with-audit';
  reason?: string;
  ruleCode?: string;
  waiverId?: string;
}

/** Relations whose OpenFGA semantics already include `but not owner` style
 * SoD — we still re-check at the SoD engine because OpenFGA only knows the
 * tuple graph, not waiver lifecycle, delegations, or agent-aware policies. */
const SOD_BOUND_RELATIONS = new Set([
  'can_approve',
  'can_sign_off',
  'can_publish',
  'can_close',
]);

export interface CheckRebacAndLogResult {
  allowed: boolean;
  decisionId: string;
  primary: RebacCheckResult;
  shadow?: RebacCheckResult;
  /** true when shadow verdict diverges from primary. */
  divergence?: boolean;
  /** SoD pairing verdict when sodGuard was supplied. */
  sod?: SodGuardResult;
}

export async function checkRebacAndLog(
  sql: SqlClient,
  input: CheckRebacAndLogInput,
): Promise<CheckRebacAndLogResult> {
  const { primary, shadow } = getRebacAdapter();

  const user = `user:${input.userId}`;
  const req = { user, relation: input.relation, object: input.object };

  // Run both verifiers in parallel when shadow is configured.
  const [primaryResult, shadowResult] = await Promise.all([
    primary.check(req),
    shadow ? shadow.check(req) : Promise.resolve<RebacCheckResult | undefined>(undefined),
  ]);

  const divergence =
    !!shadowResult && shadowResult.allowed !== primaryResult.allowed;

  // Compose engine_results for the ledger. Always include primary; shadow
  // sibling is optional.
  const engineResults: Record<string, unknown> = {};
  engineResults[primaryResult.source] = {
    allowed: primaryResult.allowed,
    modelVersion: primaryResult.modelVersion,
    latencyMs: primaryResult.latencyMs,
    trace: primaryResult.trace,
    role: 'primary',
  };
  if (shadowResult) {
    // Keyed by source (native / openfga / etc) so both can coexist when
    // primary and shadow have the same name from an odd config.
    const shadowKey = shadowResult.source === primaryResult.source
      ? `${shadowResult.source}_shadow`
      : shadowResult.source;
    engineResults[shadowKey] = {
      allowed: shadowResult.allowed,
      modelVersion: shadowResult.modelVersion,
      latencyMs: shadowResult.latencyMs,
      trace: shadowResult.trace,
      role: 'shadow',
      divergence,
    };
  }

  // ── SoD pairing for SoD-bound relations ─────────────────────────────
  // Only run when (a) caller supplied a guard AND (b) the relation is one
  // we know carries SoD semantics AND (c) OpenFGA said allow. A deny
  // already blocks; SoD can only deny further, never grant.
  let sodResult: SodGuardResult | undefined;
  let finalAllowed = primaryResult.allowed;
  let sodReason: string | undefined;
  let sodReasonCode: string | undefined;
  if (input.sodGuard && primaryResult.allowed && SOD_BOUND_RELATIONS.has(input.relation)) {
    try {
      sodResult = await input.sodGuard({
        tenantId: input.tenantId,
        userId: input.userId,
        object: input.object,
        relation: input.relation,
      });
      engineResults['sod'] = {
        allowed: sodResult.allowed,
        decision: sodResult.allowed ? 'allow' : 'deny',
        outcome: sodResult.outcome,
        ruleCode: sodResult.ruleCode,
        waiverId: sodResult.waiverId,
        reason: sodResult.reason,
        role: 'guard',
      };
      if (!sodResult.allowed) {
        finalAllowed = false;
        sodReason = sodResult.reason ?? `SoD ${sodResult.outcome}`;
        sodReasonCode =
          sodResult.outcome === 'block'
            ? 'DAUTH_DENY_SOD_BLOCK'
            : 'DAUTH_DENY_SOD_ESCALATE';
      }
    } catch (err) {
      engineResults['sod'] = {
        decision: 'error',
        reason: err instanceof Error ? err.message : String(err),
        role: 'guard',
      };
      // Fail-closed when DAUTH_SOD_FAIL_CLOSED=true.
      const failClosed = (process.env.DAUTH_SOD_FAIL_CLOSED || '').toLowerCase();
      if (failClosed === '1' || failClosed === 'true') {
        finalAllowed = false;
        sodReasonCode = 'DAUTH_DENY_SOD_UNAVAILABLE';
        sodReason = 'SoD evaluation failed (fail-closed)';
      }
    }
  }

  const baseReasonCode = finalAllowed
    ? primaryResult.source === 'openfga'
      ? 'DAUTH_ALLOW_REBAC_OPENFGA'
      : 'DAUTH_ALLOW_REBAC_NATIVE'
    : primaryResult.source === 'openfga'
      ? 'DAUTH_DENY_REBAC_OPENFGA'
      : 'DAUTH_DENY_REBAC_NATIVE';

  const ledgerInput: WriteDecisionInput = {
    tenantId: input.tenantId,
    userId: input.userId,
    action: input.action ?? `rebac.${input.relation}`,
    entityType: input.object.split(':')[0] || null as unknown as string,
    entityId:   input.object.split(':')[1] || null as unknown as string,
    allowed: finalAllowed,
    reason: sodReason ?? primaryResult.trace ?? (finalAllowed ? 'rebac allow' : 'rebac deny'),
    reasonCode: sodReasonCode ?? baseReasonCode,
    reasonCodes: sodReasonCode ? [baseReasonCode, sodReasonCode] : [],
    modelVersion: primaryResult.modelVersion,
    engineResults,
    correlationId: input.correlationId,
    requestPath: input.requestPath,
    requestMethod: input.requestMethod,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    sessionId: input.sessionId,
    detail: { rebac: req, divergence: !!divergence, sodApplied: !!sodResult },
  };

  const decisionId = await writeAuthDecision(sql, ledgerInput);

  return {
    allowed: finalAllowed,
    decisionId,
    primary: primaryResult,
    shadow: shadowResult,
    divergence: divergence || undefined,
    sod: sodResult,
  };
}
