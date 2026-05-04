import { z } from 'zod';

export const RecordCreateSchema = z.object({
  record_key: z.string().min(3).max(160).regex(/^[a-z0-9.\-]+$/),
  title:      z.string().min(3).max(240),
  kind:       z.enum(['sink','alert','dashboard','synthetic']),
  trust_zone: z.enum(['public','tenant','admin']),
  config:     z.any().optional(),
  created_by: z.string().min(1).max(120),
});

export const RecordPublishSchema = z.object({
  record_key: z.string().min(3).max(160),
  version:    z.number().int().positive(),
});

export const EventEmitSchema = z.object({
  record_key: z.string().min(3).max(160),
  kind:       z.string().min(1).max(80),
  payload:    z.any().optional(),
  emitted_by: z.string().min(1).max(120),
});
