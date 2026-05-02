import { z } from 'zod';
import { TargetKindEnum } from './permission.schemas.js';

export const ChangeKindEnum = z.enum([
  'create','update','delete','publish','rollback','approve','reject',
]);
export const PublishStatusEnum = z.enum([
  'pending','approved','rejected','cancelled','superseded',
]);
export const FormDecisionEnum = z.enum(['pending','approved','rejected','revise']);

export const ChangeLogSchema = z.object({
  target_kind: TargetKindEnum,
  target_id: z.string().min(1).max(150),
  change_kind: ChangeKindEnum,
  before_state: z.any().optional(),
  after_state: z.any().optional(),
  reason: z.string().max(2000).nullable().optional(),
});

export const PublishRequestSchema = z.object({
  target_kind: TargetKindEnum,
  target_id: z.string().min(1).max(150),
  draft_version_id: z.string().uuid().nullable().optional(),
  summary: z.string().max(2000).nullable().optional(),
});

export const PublishRequestResolveSchema = z.object({
  status: z.enum(['approved','rejected','cancelled','superseded']),
});

export const PublishApprovalSchema = z.object({
  decision: FormDecisionEnum.optional(),
  note: z.string().max(2000).nullable().optional(),
});

export const PublishedVersionSchema = z.object({
  target_kind: TargetKindEnum,
  target_id: z.string().min(1).max(150),
  version: z.string().min(1).max(40),
  payload: z.record(z.string(), z.any()).optional(),
});

export const DraftSchema = z.object({
  target_kind: TargetKindEnum,
  target_id: z.string().min(1).max(150),
  version: z.string().min(1).max(40),
  payload: z.record(z.string(), z.any()).optional(),
  is_active: z.boolean().optional(),
});

export const RollbackPointSchema = z.object({
  target_kind: TargetKindEnum,
  target_id: z.string().min(1).max(150),
  version: z.string().min(1).max(40),
  payload: z.record(z.string(), z.any()).optional(),
  reason: z.string().max(2000).nullable().optional(),
});

export const SchemaValidationSchema = z.object({
  subject_kind: TargetKindEnum,
  subject_id: z.string().min(1).max(150),
  passed: z.boolean(),
  findings: z.array(z.any()).optional(),
  validator_version: z.string().max(40).nullable().optional(),
});

export const ContractDriftSchema = z.object({
  subject_kind: TargetKindEnum,
  subject_id: z.string().min(1).max(150),
  drift_kind: z.string().min(1).max(60),
  delta: z.record(z.string(), z.any()).optional(),
});

export const AdminActivitySchema = z.object({
  action_code: z.string().min(1).max(150),
  target_kind: TargetKindEnum.optional(),
  target_id: z.string().max(150).nullable().optional(),
  payload: z.record(z.string(), z.any()).optional(),
});
