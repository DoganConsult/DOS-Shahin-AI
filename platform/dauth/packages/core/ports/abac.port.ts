/**
 * ABAC port — attribute-based policy evaluation. Abstracts whether the
 * decision comes from native DAuth services (sod-engine, lifecycle-auth,
 * policies) or an external PDP (Cerbos / OPA).
 *
 * DAuth assembles the context, calls the port, then folds the verdict into
 * `evaluateAccess`. The port's verdict is advisory in shadow mode and
 * authoritative in enforce mode.
 */

export interface AbacPrincipal {
  userId: string;
  tenantId: string;
  roles: string[];
  attributes?: Record<string, unknown>;
}

export interface AbacResource {
  type: string;
  id?: string;
  tenantId: string;
  attributes?: Record<string, unknown>;
}

export interface AbacRequest {
  principal: AbacPrincipal;
  resource: AbacResource;
  action: string;
  context?: Record<string, unknown>;
}

export interface AbacVerdict {
  decision: 'allow' | 'deny' | 'abstain';
  /** Reason code — MUST come from `contracts/reason-codes.ts`. */
  reasonCode?: string;
  /** Human-readable reason — shown in the decision ledger. */
  reason?: string;
  /** Policy identifier + semantic version, e.g. `evidence.approve@1.4.0`. */
  policyVersion?: string;
  /** Obligations the caller must honor if decision is allow (e.g. `requireDualApproval`). */
  obligations?: Record<string, unknown>;
  /** Adapter that produced this verdict. */
  source: 'native' | 'cerbos' | 'opa' | 'custom';
  /** Latency in milliseconds — for SLO observability. */
  latencyMs?: number;
}

export interface AbacAdapter {
  readonly name: 'native' | 'cerbos' | 'opa' | 'custom';

  evaluate(request: AbacRequest): Promise<AbacVerdict>;

  /**
   * Return the policy-pack version currently loaded. Stamped onto every
   * decision row so historical decisions can be replayed.
   */
  currentPolicyVersion(): Promise<string>;
}
