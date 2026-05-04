import { z } from 'zod';

export const UserEnsureSchema = z.object({
  email: z.string().email(),
  display_name: z.string().min(1),
});

export const RoleEnsureSchema = z.object({
  role_code: z.string().min(1),
  display_name: z.string().min(1),
  pillar: z.enum(['DNOC', 'DSOC', 'DOS', 'DAuth', 'ALL']),
  description: z.string().optional(),
});

export const GrantSchema = z.object({
  user_id: z.string().uuid(),
  role_code: z.string().min(1),
  granted_by: z.string().min(1),
});

export const BootstrapQuerySchema = z.object({
  email: z.string().email(),
});
