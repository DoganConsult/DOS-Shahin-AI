import type { Request, Response, NextFunction } from 'express';

/**
 * Tenant-zone context middleware (Doctrine Article 4 — tenant trust zone).
 *
 * Resolves the tenant id from the `x-tenant-id` header (set by the
 * gateway after authGuard / identity injection) and exposes it as
 * `req.tenant.tenantId`. Already-resolved upstream contexts (e.g. KC
 * token claims) are honoured — this is a defensive fallback.
 */
export interface TenantContext { tenantId: string }

declare module 'express-serve-static-core' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Request { tenant?: TenantContext }
}

export function requireTenantContext(req: Request, res: Response, next: NextFunction): void {
  if (!req.tenant?.tenantId) {
    const t = req.header('x-tenant-id');
    if (t) req.tenant = { tenantId: String(t) };
  }
  if (!req.tenant?.tenantId) {
    res.status(400).json({ error: 'tenant_context_required' });
    return;
  }
  next();
}
