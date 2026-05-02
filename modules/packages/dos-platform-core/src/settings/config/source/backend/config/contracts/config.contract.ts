import { z } from 'zod';

/**
 * Enterprise Context-Aware Domain Contract - Config
 * Strictly maps to underlying table entities and formal ingress configurations.
 */

export const ConfigBaseSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  key: z.string().regex(/^[A-Z_]+$/), value: z.union([z.string(), z.number(), z.boolean()]), isEncrypted: z.boolean().default(false), environment: z.enum(['DEV', 'STG', 'PROD']),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const ConfigCreateSchema = ConfigBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const ConfigUpdateSchema = ConfigCreateSchema.partial();

export const ConfigResponseSchema = ConfigBaseSchema;

export type ConfigCreateDTO = z.infer<typeof ConfigCreateSchema>;
export type ConfigUpdateDTO = z.infer<typeof ConfigUpdateSchema>;
export type ConfigResponseDTO = z.infer<typeof ConfigResponseSchema>;

export interface IConfigContract {
  id: string;
  tenantId: string;
  key: string; value: string | number | boolean; isEncrypted: boolean; environment: 'DEV' | 'STG' | 'PROD';
  createdAt: Date;
  updatedAt: Date;
}
