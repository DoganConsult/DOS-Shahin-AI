"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDAuthPort = createDAuthPort;
/**
 * Assemble a `DAuthPort` from concrete service functions.
 *
 * The signature is thin on purpose — each argument maps 1:1 onto a
 * canonical DAuth service. Tests can inject stubs; the runtime service
 * wires this up during bootstrap from `@dos/dauth-core` exports.
 */
function createDAuthPort(deps) {
    return {
        validateSession: deps.validateSession,
        checkAccess: deps.checkAccess,
        checkAuthority: deps.checkAuthority,
        getActiveDelegations: deps.getActiveDelegations,
        evaluateSoD: deps.evaluateSoD,
        revokeSession: deps.revokeSession,
    };
}
//# sourceMappingURL=dauth-port.impl.js.map