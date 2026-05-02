import { z } from 'zod';

/**
 * Enterprise Context-Aware Domain Contract - QualityGate
 * Strictly maps to underlying table entities and formal ingress configurations.
 */

export const QualityGateBaseSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  gateId: z.string().uuid(), testCoverageMin: z.number().min(0).max(100), blockerBypassAllowed: z.boolean(), sonarScore: z.enum(['A', 'B', 'C', 'D', 'E', 'F']), enforceNoAny: z.boolean().default(true),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const QualityGateCreateSchema = QualityGateBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const QualityGateUpdateSchema = QualityGateCreateSchema.partial();

export const QualityGateResponseSchema = QualityGateBaseSchema;

export type QualityGateCreateDTO = z.infer<typeof QualityGateCreateSchema>;
export type QualityGateUpdateDTO = z.infer<typeof QualityGateUpdateSchema>;
export type QualityGateResponseDTO = z.infer<typeof QualityGateResponseSchema>;

export interface IQualityGateContract {
  id: string;
  tenantId: string;
  gateId: string; testCoverageMin: number; blockerBypassAllowed: boolean; sonarScore: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; enforceNoAny: boolean;
  createdAt: Date;
  updatedAt: Date;
}
