// @ts-nocheck
import { z } from 'zod';

export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  triggeringEvents: z.array(z.string()).optional()
});

export const CreateStepSchema = z.object({
  stepOrder: z.number().min(1),
  title: z.string().min(1).max(255),
  instructionsMd: z.string().optional(),
  isAutomated: z.boolean().default(false),
  requiredRole: z.string().max(100).optional()
});

export const ExecutePlaybookSchema = z.object({
  triggerSourceEntity: z.string().max(255).optional()
});

export const LogStepSchema = z.object({
  stepId: z.string().uuid(),
  resultData: z.record(z.unknown()).optional()
});
