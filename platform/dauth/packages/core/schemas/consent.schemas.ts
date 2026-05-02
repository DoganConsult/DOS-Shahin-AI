import { z } from 'zod';

const consentType = z.string().min(1).max(50);
const consentVersion = z.string().min(1).max(20).default('1.0');
const legalBasis = z.enum(['consent', 'legitimate_interest', 'contract', 'legal_obligation', 'vital_interest', 'public_interest']).default('consent');
const consentAction = z.enum(['grant', 'revoke', 'forget', 'export', 'update_purpose']);

export const grantConsentBody = z.object({
  consentType,
  consentVersion,
  legalBasis,
  dataCategories: z.array(z.string().max(100)).max(50).default([]),
  retentionPeriodDays: z.number().int().min(1).max(3650).default(365),
  purpose: z.string().max(1000).optional(),
}).strict();

export const revokeConsentBody = z.object({
  consentType,
  consentVersion,
  reason: z.string().max(500).optional(),
}).strict();

export const consentListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  consentType: consentType.optional(),
  granted: z.enum(['true', 'false']).optional(),
}).partial();

export const memoryConsentBody = z.object({
  action: consentAction,
  purpose: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
}).strict();

export type GrantConsentInput = z.infer<typeof grantConsentBody>;
export type RevokeConsentInput = z.infer<typeof revokeConsentBody>;
export type MemoryConsentInput = z.infer<typeof memoryConsentBody>;
