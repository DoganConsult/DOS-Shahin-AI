/**
 * Foundation module — Express Request augmentation.
 * Adds the tenant + user context that the host service injects via auth middleware.
 * Kept inside the module so the module typechecks standalone.
 */
import 'express';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      user?: {
        id?: string;
        userId?: string;
        email?: string;
        roles?: string[];
        permissions?: string[];
        tenantId?: string;
        [k: string]: any;
      };
    }
  }
}

export {};
