// Top-level auth port barrel. Pattern matches modules/onboarding/source/ports/auth.port.ts.
// Module services import via dynamic `await import('../../../ports/auth.port.js')`.
export { authenticate, requirePermission, requireTenantId } from '@dos/module-auth';
export { evaluateLifecycleTransition, isUserEmailVerified } from '@dos/module-auth';
