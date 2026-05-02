// @ts-nocheck
import { z } from 'zod';

export const CreateCampaignSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  campaignType: z.enum(['periodic', 'event_driven', 'continuous']).default('periodic'),
  dueDate: z.string().datetime().optional(),
  scopeJson: z.record(z.unknown()).optional(),
  frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']).default('quarterly'),
});

export const CreateRecordSchema = z.object({
  campaignId: z.string().uuid(),
  attestorUserId: z.string().uuid(),
  entityType: z.string().min(1).max(100),
  entityId: z.string().uuid(),
});

export const ReviewRecordSchema = z.object({
  reviewStatus: z.enum(['approved', 'rejected']),
  reviewComment: z.string().optional(),
});

export const TransitionCampaignSchema = z.object({
  targetStatus: z.enum(['active', 'closed']),
});
