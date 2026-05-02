import type { AuthenticatedUser } from '@dos/types/express';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      tenantId?: string;
      tenantSchema?: string;
      correlationId?: string;
    }
  }
}

export {};
