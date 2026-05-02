// Action module auth port — uses @dos/module-auth (the lazy-resolving
// variant) instead of @dos/module-sdk (which requires setAuthMiddleware()
// at platform boot — incompatible with module-load ordering). Mirrors the
// pattern already in modules/risk/.../ports/auth.port.ts.
export { authenticate, requirePermission } from '@dos/module-auth';
export { evaluateLifecycleTransition } from '@dos/module-auth';
