export { safeQuery } from '../../../shared/database/safe-query';
export declare function tenantSchema(tenantId: string): string;
export { authenticate, requirePermission } from '@dos/module-auth';
export declare const validate: (schemas: Record<string, any>) => (req: any, _res: any, next: any) => any;
export declare const asyncHandler: (fn: Function) => (req: any, res: any, next: any) => Promise<any>;
export { setAuditData } from '@dos/platform-core/http';
