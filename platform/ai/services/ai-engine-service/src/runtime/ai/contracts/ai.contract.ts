import { z } from 'zod';

/**
 * Enterprise Context-Aware Domain Contract - Ai
 * Strictly maps to underlying table entities and formal ingress configurations.
 */

export const AiBaseSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  modelId: z.string().uuid(), provider: z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE']), maxTokens: z.number().int().max(128000), temperature: z.number().min(0).max(1), systemPrompt: z.string().min(10),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const AiCreateSchema = AiBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const AiUpdateSchema = AiCreateSchema.partial();

export const AiResponseSchema = AiBaseSchema;

export type AiCreateDTO = z.infer<typeof AiCreateSchema>;
export type AiUpdateDTO = z.infer<typeof AiUpdateSchema>;
export type AiResponseDTO = z.infer<typeof AiResponseSchema>;

export interface IAiContract {
  id: string;
  tenantId: string;
  modelId: string; provider: 'OPENAI' | 'ANTHROPIC' | 'GOOGLE'; maxTokens: number; temperature: number; systemPrompt: string;
  createdAt: Date;
  updatedAt: Date;
}
