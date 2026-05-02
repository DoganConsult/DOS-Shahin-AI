import { z } from 'zod';

export const FlagTargetKindEnum = z.enum(['tenant','role','user','product','module']);

export const FeatureFlagSchema = z.object({
  flag_code: z.string().min(1).max(150),
  description_key: z.string().max(200).nullable().optional(),
  default_value: z.any().optional(),
  is_active: z.boolean().optional(),
});

export const FlagAssignmentSchema = z.object({
  target_kind: FlagTargetKindEnum,
  target_id: z.string().min(1).max(120),
  value: z.any(),
});

export const ExperimentSchema = z.object({
  experiment_code: z.string().min(1).max(150),
  hypothesis: z.string().max(4000).nullable().optional(),
  metric_keys: z.array(z.string().max(100)).optional(),
  started_at: z.string().datetime().nullable().optional(),
  ended_at: z.string().datetime().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const VariantSchema = z.object({
  variant_code: z.string().min(1).max(60),
  description_key: z.string().max(200).nullable().optional(),
  traffic_pct: z.number().int().min(0).max(100).optional(),
  is_control: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const ExperimentAssignmentSchema = z.object({
  user_id: z.string().min(1).max(64),
  variant_id: z.string().uuid(),
});

export const RolloutRuleSchema = z.object({
  flag_id: z.string().uuid().nullable().optional(),
  experiment_id: z.string().uuid().nullable().optional(),
  rule_kind: z.string().min(1).max(60),
  rule_payload: z.record(z.string(), z.any()).optional(),
  priority: z.number().int().optional(),
  is_active: z.boolean().optional(),
}).refine((d) => Boolean(d.flag_id) !== Boolean(d.experiment_id),
  { message: 'exactly one of flag_id or experiment_id is required' });

export const KillSwitchSchema = z.object({
  switch_code: z.string().min(1).max(150),
  is_active: z.boolean().optional(),
  reason: z.string().max(2000).nullable().optional(),
});

export const KillSwitchTriggerSchema = z.object({
  reason: z.string().max(2000).nullable().optional(),
});
