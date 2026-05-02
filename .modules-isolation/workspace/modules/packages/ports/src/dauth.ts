/**
 * DAuthPort — public surface of the DAuth platform module.
 *
 * Callers (DOS, DSOC, DNOC, products) interact with DAuth exclusively through
 * this port. Internal adapter ports (Keycloak, OpenFGA, Cerbos, secrets,
 * token-verifier) are DAuth's private concern and stay under
 * `platform/dauth/packages/core/ports/`.
 */

export type DAuthDecision = 'allow' | 'deny';

export interface DAuthPrincipal {
  readonly userId: string;
  readonly tenantId: string;
  readonly roles: readonly string[];
  readonly scopes: readonly string[];
  readonly attributes?: Readonly<Record<string, unknown>>;
}

export interface DAuthSession {
  readonly sessionId: string;
  readonly principal: DAuthPrincipal;
  readonly mfaSatisfied: boolean;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

export interface DAuthAccessRequest {
  readonly principal: DAuthPrincipal;
  readonly action: string;
  readonly resource: { readonly type: string; readonly id?: string };
  readonly context?: Readonly<Record<string, unknown>>;
}

export interface DAuthAccessResult {
  readonly decision: DAuthDecision;
  readonly decisionId: string;
  readonly reasonCodes: readonly string[];
  readonly obligations?: Readonly<Record<string, unknown>>;
  readonly policyVersion?: string;
  readonly evaluatedAt: string;
}

export interface DAuthAuthorityCheck {
  readonly principal: DAuthPrincipal;
  readonly authorityCode: string;
  readonly targetEntity?: { readonly type: string; readonly id: string };
}

export interface DAuthDelegationContext {
  readonly delegationId: string;
  readonly grantedBy: string;
  readonly grantedTo: string;
  readonly scope: readonly string[];
  readonly validFrom: string;
  readonly validUntil: string;
}

export interface DAuthSoDResult {
  readonly conflict: boolean;
  readonly ruleCodes: readonly string[];
  readonly advisory?: string;
}

export interface DAuthPort {
  /** Verify a bearer token / session token and return the session, or null. */
  validateSession(token: string): Promise<DAuthSession | null>;

  /** Evaluate an access decision. Single canonical entry point. */
  checkAccess(request: DAuthAccessRequest): Promise<DAuthAccessResult>;

  /** Check whether the principal holds a specific decision authority. */
  checkAuthority(check: DAuthAuthorityCheck): Promise<boolean>;

  /** Return active delegations that apply to a principal right now. */
  getActiveDelegations(principal: DAuthPrincipal): Promise<readonly DAuthDelegationContext[]>;

  /** Evaluate SoD for a proposed role-assignment / permission-grant. */
  evaluateSoD(
    principal: DAuthPrincipal,
    proposedGrants: readonly { roleCode?: string; permissionCode?: string }[],
  ): Promise<DAuthSoDResult>;

  /**
   * Revoke a session. Idempotent: returns true if a live session was revoked,
   * false if the session was already absent/expired.
   */
  revokeSession(sessionId: string, reason: string): Promise<boolean>;
}
