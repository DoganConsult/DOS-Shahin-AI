export { authenticate, requirePermission, requireTenantId } from '@dos/dauth-shared';
export function logAuthDecision(...args: any[]): void {}
export function preventSelfApproval(...args: any[]): any { return (_req: any, _res: any, next: any) => next(); }
