// @ts-nocheck
export { safeQuery } from '../../../shared/database/safe-query';
export function tenantSchema(tenantId: string): string { return `tenant_${tenantId.replace(/-/g, '_')}`; }
export { authenticate, requirePermission } from '@dos/module-auth';
export const validate = (schemas: Record<string, any>) => (req: any, _res: any, next: any) => {
  for (const [key, schema] of Object.entries(schemas)) {
    const source = key === 'body' ? req.body : key === 'query' ? req.query : req.params;
    const result = (schema as any).safeParse(source);
    if (!result.success) { return next(result.error); }
    if (key === 'body') req.body = result.data;
  }
  next();
};
export const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
export { setAuditData } from '@dos/platform-core/http';
