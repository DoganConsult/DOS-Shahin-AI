/**
 * Auth port shim — re-exports from the canonical compliance auth port.
 *
 * All four integration sub-packages (admin, audit, dora, notification) use
 * identical auth requirements: authenticate, requirePermission, evaluateLifecycleTransition
 * and the Wave-1 externalAuthGuard. Rather than duplicating the implementation,
 * each shim re-exports from the single source of truth at
 * modules/compliance/ports/auth.port.ts.
 *
 * When the regulator portal is certified (post Wave-1), update
 * modules/compliance/ports/auth.port.ts — this shim picks up the change
 * automatically.
 */
export {
  authenticate,
  requirePermission,
  evaluateLifecycleTransition,
  externalAuthGuard,
} from '../../../ports/auth.port.js';
