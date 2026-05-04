import { z } from 'zod';

export const TenantQuerySchema = z.object({
  tenant_id: z.string().min(1),
});

export const MemberUpsertSchema = z.object({
  tenant_id: z.string().min(1),
  user_id: z.string().min(1),
  role_code: z.string().min(1),
  is_tenant_owner: z.boolean().optional(),
});
