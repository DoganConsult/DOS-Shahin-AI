import { z } from 'zod';

export const BootstrapRequestSchema = z.object({
  tenantId: z.string().uuid().optional(),
});

export const BootstrapPayloadSchema = z.object({
  session: z.object({
    userId: z.string(),
    email: z.string().email(),
    issuedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  }),
  tenant: z.object({
    tenantId: z.string(),
    name: z.string().nullable(),
    status: z.string(),
  }),
  modules: z.array(z.string()),
  permissions: z.array(z.string()),
  roles: z.array(z.string()),
  uiCatalogVersion: z.string(),
  nav: z.object({
    primary: z.array(z.unknown()),
    secondary: z.array(z.unknown()),
  }),
  shell: z.object({
    surfaces: z.array(z.unknown()),
  }),
  cacheKey: z.object({
    tenantId: z.string(),
    roleSetHash: z.string(),
    uiCatalogVersion: z.string(),
  }),
});

export type BootstrapPayload = z.infer<typeof BootstrapPayloadSchema>;
