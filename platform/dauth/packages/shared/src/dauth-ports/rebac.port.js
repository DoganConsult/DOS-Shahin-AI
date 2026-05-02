"use strict";
/**
 * ReBAC port — relationship-based access checks (owner, reviewer, member,
 * approver, acts_on_behalf_of, etc.). Abstracts whether the verdict comes
 * from the native DAuth scope-resolver + ownership adapter or from an
 * external graph store (OpenFGA, SpiceDB).
 *
 * Native behavior invariant: when no external adapter is enforced, the
 * NativeRebacAdapter returns a **pass-through allow**. This matches the
 * historical runtime where DAuth did not gate on ReBAC at this layer;
 * tenant isolation / scope was enforced by RLS + scope-resolver. Flipping
 * `DAUTH_OPENFGA_ENFORCE=true` swaps the primary to the OpenFGA adapter,
 * which actually gates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=rebac.port.js.map