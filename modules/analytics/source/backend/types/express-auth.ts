import type { AuthenticatedUser } from '@dos/types/express';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      tenantId?: string;
      tenantSchema?: string;
      resolvedTenantId?: string;
      correlationId?: string;
      permissions?: string[];
      userId?: string;
      userRole?: string;
    }
  }
}

export {};