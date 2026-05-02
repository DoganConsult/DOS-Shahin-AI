import { z } from 'zod';

/**
 * Enterprise Context-Aware Domain Contract - Governance
 * Strictly maps to underlying table entities and formal ingress configurations.
 */

export const GovernanceBaseSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  frameworkId: z.string().uuid(), committeeApproval: z.boolean(), reviewCycleDays: z.number().int(), compliancePercent: z.number().min(0).max(100), nextAuditDate: z.date(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const GovernanceCreateSchema = GovernanceBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const GovernanceUpdateSchema = GovernanceCreateSchema.partial();

export const GovernanceResponseSchema = GovernanceBaseSchema;

export type GovernanceCreateDTO = z.infer<typeof GovernanceCreateSchema>;
export type GovernanceUpdateDTO = z.infer<typeof GovernanceUpdateSchema>;
export type GovernanceResponseDTO = z.infer<typeof GovernanceResponseSchema>;

export interface IGovernanceContract {
  id: string;
  tenantId: string;
  frameworkId: string; committeeApproval: boolean; reviewCycleDays: number; compliancePercent: number; nextAuditDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
