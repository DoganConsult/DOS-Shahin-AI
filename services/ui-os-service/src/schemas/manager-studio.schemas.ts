import { z } from 'zod';
import { TargetKindEnum } from './permission.schemas.js';

export const ManagerDraftStateEnum = z.enum([
  'draft','validating','submitted','rejected','published',
]);
export const JobStatusEnum = z.enum([
  'queued','running','succeeded','failed','expired','cancelled',
]);

export const ManagerProjectSchema = z.object({
  project_key: z.string().min(1).max(150),
  name: z.string().min(1).max(200),
  description: z.string().max(4000).nullable().optional(),
  is_active: z.boolean().optional(),
});

export const ManagerDraftCreateSchema = z.object({
  project_id: z.string().uuid(),
  target_kind: TargetKindEnum,
  target_id: z.string().min(1).max(150),
  payload: z.record(z.string(), z.any()).optional(),
  state: ManagerDraftStateEnum.optional(),
});

export const ManagerDraftUpdateSchema = z.object({
  payload: z.record(z.string(), z.any()).optional(),
  state: ManagerDraftStateEnum.optional(),
});

export const ManagerLockAcquireSchema = z.object({
  target_kind: TargetKindEnum,
  target_id: z.string().min(1).max(150),
  ttl_minutes: z.number().int().min(1).max(240).optional(),
});

export const ManagerCommentSchema = z.object({
  body: z.string().min(1).max(8000),
});

export const ManagerValidationRunSchema = z.object({
  project_id: z.string().uuid(),
  kind: z.string().min(1).max(60),
  passed: z.boolean(),
  findings: z.array(z.any()).optional(),
  validator_version: z.string().max(40).nullable().optional(),
});

export const ManagerPreviewSessionSchema = z.object({
  project_id: z.string().uuid(),
  ttl_minutes: z.number().int().min(1).max(1440).optional(),
});

export const ManagerImportJobCreateSchema = z.object({
  project_id: z.string().uuid().nullable().optional(),
  kind: z.string().min(1).max(60),
  source_url: z.string().max(2000).nullable().optional(),
});

export const ManagerExportJobCreateSchema = z.object({
  project_id: z.string().uuid().nullable().optional(),
  kind: z.string().min(1).max(60),
  target_format: z.string().min(1).max(20),
});

export const ManagerJobUpdateSchema = z.object({
  status: JobStatusEnum.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  download_url: z.string().max(2000).nullable().optional(),
  error: z.record(z.string(), z.any()).optional(),
  started_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
});
