"use strict";
/**
 * ABAC port — attribute-based policy evaluation. Abstracts whether the
 * decision comes from native DAuth services (sod-engine, lifecycle-auth,
 * policies) or an external PDP (Cerbos / OPA).
 *
 * DAuth assembles the context, calls the port, then folds the verdict into
 * `evaluateAccess`. The port's verdict is advisory in shadow mode and
 * authoritative in enforce mode.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=abac.port.js.map