import { z } from 'zod';

/**
 * Enterprise Context-Aware Domain Contract - Connectors
 * Strictly maps to underlying table entities and formal ingress configurations.
 */

export const ConnectorsBaseSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  integrationHost: z.string().url(), authType: z.enum(['OAUTH2', 'API_KEY', 'BASIC']), isActive: z.boolean(), retryLimit: z.number().int().max(5), timeoutMs: z.number().max(60000),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const ConnectorsCreateSchema = ConnectorsBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const ConnectorsUpdateSchema = ConnectorsCreateSchema.partial();

export const ConnectorsResponseSchema = ConnectorsBaseSchema;

export type ConnectorsCreateDTO = z.infer<typeof ConnectorsCreateSchema>;
export type ConnectorsUpdateDTO = z.infer<typeof ConnectorsUpdateSchema>;
export type ConnectorsResponseDTO = z.infer<typeof ConnectorsResponseSchema>;

export interface IConnectorsContract {
  id: string;
  tenantId: string;
  integrationHost: string; authType: 'OAUTH2' | 'API_KEY' | 'BASIC'; isActive: boolean; retryLimit: number; timeoutMs: number;
  createdAt: Date;
  updatedAt: Date;
}
