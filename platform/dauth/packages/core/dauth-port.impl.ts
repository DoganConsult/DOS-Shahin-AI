/**
 * DAuthPort binding layer.
 *
 * Exposes a production-grade `DAuthPort` implementation assembled from the
 * existing DAuth services. Callers from other platform modules (DOS, DSOC,
 * DNOC) and from products MUST consume DAuth through this port — direct
 * imports of individual services are not part of the contract.
 *
 * NOTE: This file intentionally adapts rather than re-implements. The
 * underlying services (decision engine, session service, authority service,
 * delegation service, SoD engine) are already production-grade and remain
 * the single source of truth for each capability.
 */

import type {
  DAuthAccessRequest,
  DAuthAccessResult,
  DAuthAuthorityCheck,
  DAuthDelegationContext,
  DAuthPort,
  DAuthPrincipal,
  DAuthSession,
  DAuthSoDResult,
} from '@dos/ports/dauth';

export interface DAuthPortDependencies {
  /** Verifies a bearer token and returns the decoded session, or null. */
  readonly validateSession: (token: string) => Promise<DAuthSession | null>;
  /** The decision engine `can()` entrypoint. */
  readonly checkAccess: (request: DAuthAccessRequest) => Promise<DAuthAccessResult>;
  /** Authority service lookup. */
  readonly checkAuthority: (check: DAuthAuthorityCheck) => Promise<boolean>;
  /** Active-delegation resolver for a principal. */
  readonly getActiveDelegations: (
    principal: DAuthPrincipal,
  ) => Promise<readonly DAuthDelegationContext[]>;
  /** SoD conflict engine. */
  readonly evaluateSoD: (
    principal: DAuthPrincipal,
    proposedGrants: readonly { roleCode?: string; permissionCode?: string }[],
  ) => Promise<DAuthSoDResult>;
  /** Session revocation; returns true if a live session was revoked. */
  readonly revokeSession: (sessionId: string, reason: string) => Promise<boolean>;
}

/**
 * Assemble a `DAuthPort` from concrete service functions.
 *
 * The signature is thin on purpose — each argument maps 1:1 onto a
 * canonical DAuth service. Tests can inject stubs; the runtime service
 * wires this up during bootstrap from `@dos/dauth-core` exports.
 */
export function createDAuthPort(deps: DAuthPortDependencies): DAuthPort {
  return {
    validateSession: deps.validateSession,
    checkAccess: deps.checkAccess,
    checkAuthority: deps.checkAuthority,
    getActiveDelegations: deps.getActiveDelegations,
    evaluateSoD: deps.evaluateSoD,
    revokeSession: deps.revokeSession,
  };
}

export type { DAuthPort } from '@dos/ports/dauth';
