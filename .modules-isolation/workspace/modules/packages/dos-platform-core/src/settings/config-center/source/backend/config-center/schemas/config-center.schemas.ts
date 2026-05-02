import { z } from 'zod';

export const resolveKeyParamsSchema = z.object({
  key: z.string().min(1).max(256),
});

export const resolveBatchBodySchema = z.object({
  keys: z.array(z.string().min(1).max(256)).min(1).max(100),
});

export const resolveAllQuerySchema = z.object({
  scope: z.enum(['platform', 'product', 'tenant', 'workspace', 'module', 'user']).optional(),
  moduleCode: z.string().optional(),
  productKey: z.string().optional(),
});

export const upsertSettingBodySchema = z.object({
  value: z.unknown(),
  scope: z.enum(['platform', 'product', 'tenant', 'workspace', 'module', 'user']).optional(),
  moduleCode: z.string().optional(),
  productKey: z.string().optional(),
  workspaceId: z.string().optional(),
  reason: z.string().max(500).optional(),
});

export const compareTenantsQuerySchema = z.object({
  tenantA: z.string().min(1),
  tenantB: z.string().min(1),
  scope: z.enum(['platform', 'product', 'tenant', 'workspace', 'module', 'user']).optional(),
});

export const importConfigBodySchema = z.object({
  snapshot: z.object({
    tenantId: z.string(),
    exportedAt: z.string(),
    exportedBy: z.string(),
    version: z.string(),
    scopes: z.array(z.string()),
    settings: z.record(z.string(), z.object({
      value: z.unknown(),
      scope: z.string(),
      moduleCode: z.string().optional(),
    })),
    metadata: z.object({
      settingCount: z.number(),
      scopeBreakdown: z.record(z.string(), z.number()),
    }),
  }),
  dryRun: z.boolean().optional().default(false),
});

export const auditQuerySchema = z.object({
  key: z.string().optional(),
  actorId: z.string().optional(),
  scope: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});
