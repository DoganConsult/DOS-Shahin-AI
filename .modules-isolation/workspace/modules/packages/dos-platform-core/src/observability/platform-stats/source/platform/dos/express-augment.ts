import type { AuthenticatedUser } from '@dos/types/express';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      tenantId?: string;
      tenantSchema?: string;
      moduleCode?: string;
      module?: string;
      resolvedTenantId?: string;
      correlationId?: string;
      lang?: string;
      userId?: string;
      permissions?: string[];
      userRole?: string;
      ownershipField?: string;
      requestingUserId?: string;
      aiOperationMode?: string;
      _catalogAll?: boolean;
      resolvedProductKey?: string;
      lifecycleAuth?: { allowed: boolean; reason?: string; fromStatus?: string; toStatus?: string };
      scope?: { tenantId: string; orgId?: string; buId?: string; deptId?: string; teamId?: string };
      apiKey?: Record<string, unknown>;
      externalScope?: { tenantId: string; entityType: string; entityId: string; role: string; permissions: string[] };
    }
  }
}

export {};
