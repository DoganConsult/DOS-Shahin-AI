import { z } from 'zod';

export const ProductSchema = z.object({
  product_code: z.string().min(2).max(48).regex(/^[a-z][a-z0-9-]*$/),
  display_name: z.string().min(2),
  edition_default: z.string().optional().nullable(),
  marketing_root: z.string().optional().nullable(),
  workspace_root: z.string().optional().nullable(),
  status: z.enum(['active', 'beta', 'retired']).optional(),
});
export type ProductInput = z.infer<typeof ProductSchema>;

export const EnrollSchema = z.object({
  product_code: z.string(),
  module_code: z.string().regex(/^[a-z][a-z0-9-]*$/),
  edition: z.string().default('standard'),
  enabled: z.boolean().default(true),
});

export const ServiceSchema = z.object({
  service_code: z.string().regex(/^[a-z][a-z0-9-]*$/),
  display_name: z.string(),
  trust_zone: z.enum(['public', 'tenant', 'admin']),
  port: z.number().int().min(1024).max(65535),
  pm2_name: z.string().optional().nullable(),
});
