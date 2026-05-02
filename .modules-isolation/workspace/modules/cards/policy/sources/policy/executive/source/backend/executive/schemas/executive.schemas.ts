// @ts-nocheck
import { z } from 'zod';

export const CreateBriefSchema = z.object({
  title: z.string().min(1).max(500),
  referenceDate: z.string().optional(),
  generationMethod: z.enum(['ai_generated', 'manual']).default('ai_generated'),
});

export const ApproveBriefSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export const CreateObjectiveSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  targetKpi: z.string().max(255).optional(),
  targetValue: z.number().optional(),
  ownerUserId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
});

export const UpdateObjectiveSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  currentValue: z.number().optional(),
  targetValue: z.number().optional(),
  progressPct: z.number().min(0).max(100).optional(),
  status: z.enum(['active', 'achieved', 'at_risk', 'cancelled']).optional(),
});

export const CreateAppetiteSchema = z.object({
  domainCategory: z.string().min(1).max(255),
  quantitativeLimit: z.number().optional(),
  qualitativeLimitDesc: z.string().optional(),
});
