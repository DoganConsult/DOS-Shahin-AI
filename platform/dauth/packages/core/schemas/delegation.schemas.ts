import { z } from 'zod';

const delegationScopeCode = z.enum([
  'onboarding',
  'workspace_setup',
  'policy_drafting',
  'risk_seeding',
  'control_mapping',
  'evidence_upload',
  'assessment',
]);

export const createDelegationGrantBody = z.object({
  agentId: z.string().min(1).max(64),
  scopes: z.array(delegationScopeCode).min(1).max(10),
  durationMinutes: z.number().int().min(1).max(10080).default(60),
}).strict();

export const revokeDelegationGrantBody = z.object({
  grantId: z.string().uuid(),
  reason: z.string().max(500).optional(),
}).strict();

export const validateDelegationBody = z.object({
  grantId: z.string().uuid(),
  agentId: z.string().min(1).max(64),
}).strict();

export const sodWaiverBody = z.object({
  policyId: z.string().uuid(),
  justification: z.string().min(10).max(2000),
  expiresAt: z.string().datetime().optional(),
}).strict();

export type CreateDelegationGrantInput = z.infer<typeof createDelegationGrantBody>;
export type RevokeDelegationGrantInput = z.infer<typeof revokeDelegationGrantBody>;
export type SodWaiverInput = z.infer<typeof sodWaiverBody>;
