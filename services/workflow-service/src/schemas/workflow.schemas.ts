import { z } from 'zod';

export const DefinitionCreateSchema = z.object({
  workflow_key: z.string().min(3).max(120).regex(/^[a-z0-9.\-]+$/),
  title:        z.string().min(3).max(240),
  kind:         z.enum(['approval','provisioning','review','remediation','attestation','generic']),
  trust_zone:   z.enum(['public','tenant','admin']),
  definition:   z.any(),
  created_by:   z.string().min(1).max(120),
});

export const DefinitionPublishSchema = z.object({
  workflow_key: z.string().min(3).max(120),
  version:      z.number().int().positive(),
});

export const InstanceStartSchema = z.object({
  workflow_key:   z.string().min(3).max(120),
  initiated_by:   z.string().min(1).max(120),
  tenant_id:      z.string().uuid().optional().nullable(),
  context:        z.any().optional(),
  correlation_id: z.string().max(160).optional().nullable(),
});

export const SignalEmitSchema = z.object({
  instance_id: z.string().uuid(),
  kind:        z.string().min(1).max(80),
  payload:     z.any().optional(),
  emitted_by:  z.string().min(1).max(120),
});

export const StepCompleteSchema = z.object({
  instance_id: z.string().uuid(),
  step_id:     z.string().min(1).max(120),
  output:      z.any().optional(),
});
