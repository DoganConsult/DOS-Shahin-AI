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

let bound: DSOCPort | null = null;

/** Product shell calls this once at bootstrap to wire a DSOCPort impl. */
export function bindModuleSOC(port: DSOCPort): void {
  bound = port;
}

/** Tests / hot-reload — unbinds the port. */
export function resetModuleSOC(): void {
  bound = null;
}

function requirePort(): DSOCPort {
  if (!bound) {
    throw new Error(
      '[@dos/module-soc] not bound. Product shell must call bindModuleSOC(port) during bootstrap before any module emits audit events.',
    );
  }
  return bound;
}

export async function emitAudit(event: DSOCAuditEvent): Promise<void> {
  await requirePort().recordAuditEvent(event);
}

export async function raiseAlert(event: DSOCAuditEvent): Promise<void> {
  await requirePort().raiseAlert(event);
}

// Types re-exported so module code doesn't reach into @dos/ports.
export type {
  DSOCAuditEvent,
  DSOCSeverity,
  DSOCEventCategory,
  DSOCPostureSnapshot,
  DSOCPort,
} from '@dos/ports/dsoc';
