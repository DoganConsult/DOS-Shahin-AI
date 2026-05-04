import { z } from 'zod';

export const CreateRevisionSchema = z.object({
  target_kind: z.enum(['page', 'component', 'route', 'brand-kit', 'nav', 'archetype-props']),
  target_key: z.string().min(1),
  payload: z.record(z.unknown()),
  created_by: z.string().min(1),
  change_request_id: z.string().uuid().optional().nullable(),
});

export const PublishSchema = z.object({
  revision_id: z.string().uuid(),
});

export const RollbackSchema = z.object({
  revision_id: z.string().uuid(),
  rolled_back_by: z.string().min(1),
  reason: z.string().min(3),
});

export const TargetEnsureSchema = z.object({
  target_kind: z.string().min(1),
  target_key: z.string().min(1),
  display_name: z.string().min(1),
  owner_team: z.string().optional().nullable(),
});
