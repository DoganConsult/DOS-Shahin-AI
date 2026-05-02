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
      /**
       * Gateway-origin verified principal (Wave 1 trust-boundary contract).
       * Populated by `requireGatewayOrigin` middleware after HMAC verification
       * of `x-dos-gateway-token`. When present this is the AUTHORITATIVE
       * identity; raw `x-user-*` / `x-tenant-id` headers must be ignored.
       */
      principal?: { sub: string; tenantId: string; email: string; roles: string[] };
    }
  }
}

export {};
