export { authenticate, requirePermission, requireTenantId } from '@dos/dauth-shared';
export async function logAuthDecision(...args: any[]): Promise<void> {}
export function preventSelfApproval(...args: any[]): any { return { allowed: true }; }
export function evaluateLifecycleTransition(...args: any[]): { allowed: boolean; reason?: string; checks?: any[] } {
  return { allowed: true };
}
