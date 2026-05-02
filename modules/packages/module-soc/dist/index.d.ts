/**
 * @dos/module-soc — module-facing security-ops surface.
 *
 * Modules import `emitAudit()` / `raiseAlert()` from this package. The
 * implementation is wired by the product shell at bootstrap — typically
 * a thin HTTP client pointed at /api/dsoc/port/v1, or a test-time stub.
 *
 * A module NEVER imports from @dos/dsoc-*. Enforced by
 * `modules-cannot-import-dsoc-direct` in .dependency-cruiser.cjs.
 */
import type { DSOCAuditEvent, DSOCPort } from '@dos/ports/dsoc';
/** Product shell calls this once at bootstrap to wire a DSOCPort impl. */
export declare function bindModuleSOC(port: DSOCPort): void;
/** Tests / hot-reload — unbinds the port. */
export declare function resetModuleSOC(): void;
export declare function emitAudit(event: DSOCAuditEvent): Promise<void>;
export declare function raiseAlert(event: DSOCAuditEvent): Promise<void>;
export type { DSOCAuditEvent, DSOCSeverity, DSOCEventCategory, DSOCPostureSnapshot, DSOCPort, } from '@dos/ports/dsoc';
//# sourceMappingURL=index.d.ts.map