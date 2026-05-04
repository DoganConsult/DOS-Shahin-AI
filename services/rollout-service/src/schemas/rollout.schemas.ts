import { z } from 'zod';

export const PlanCreateSchema = z.object({
  title: z.string().min(1),
  created_by: z.string().min(1),
  change_request_id: z.string().uuid().optional().nullable(),
});

export const RingAdvanceSchema = z.object({
  plan_id: z.string().uuid(),
  ring_code: z.enum(['R0', 'R1', 'R2', 'R3', 'R4', 'R5']),
});

export const RingRollbackSchema = z.object({
  plan_id: z.string().uuid(),
  ring_code: z.enum(['R0', 'R1', 'R2', 'R3', 'R4', 'R5']),
  triggered_by: z.string().min(1),
  reason: z.string().min(3),
});

export const EvaluateSchema = z.object({
  plan_id: z.string().uuid(),
  ring_code: z.enum(['R0', 'R1', 'R2', 'R3', 'R4', 'R5']),
  signals: z.record(z.number()).default({}),
});
