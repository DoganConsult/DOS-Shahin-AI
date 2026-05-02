import { z } from 'zod';

export const ASSET_TYPES = ['video', 'pdf', 'presentation', 'brochure', 'onepager', 'legal', 'technical', 'image'] as const;
export const AUDIENCES = ['public', 'prospect', 'investor', 'partner', 'internal'] as const;
export const INGESTION_STATUSES = ['pending', 'processing', 'ready', 'failed'] as const;

export const slugSchema = z.string().min(2).max(160).regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'lowercase-kebab');

export const baseAssetFields = {
  slug: slugSchema,
  title_en: z.string().min(1).max(300),
  title_ar: z.string().max(300).optional().nullable(),
  description_en: z.string().max(5000).optional().nullable(),
  description_ar: z.string().max(5000).optional().nullable(),
  asset_type: z.enum(ASSET_TYPES),
  product_code: z.string().max(64).optional().nullable(),
  language: z.string().min(2).max(8).default('en'),
  audience: z.enum(AUDIENCES).default('public'),
  tags: z.array(z.string().min(1).max(60)).max(40).default([]),
  is_public: z.boolean().default(false),
  is_active: z.boolean().default(true),
  allow_preview: z.boolean().default(true),
  allow_download: z.boolean().default(false),
  require_lead_capture: z.boolean().default(false),
  watermark_required: z.boolean().default(false),
  sort_order: z.number().int().min(0).max(100000).default(0),
};

export const createAssetSchema = z.object({ ...baseAssetFields });
export const patchAssetSchema = z.object({
  ...Object.fromEntries(Object.entries(baseAssetFields).map(([k, v]) => [k, (v as z.ZodTypeAny).optional()])),
}) as unknown as z.ZodObject<{ [K in keyof typeof baseAssetFields]: z.ZodOptional<typeof baseAssetFields[K]> }>;

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  asset_type: z.enum(ASSET_TYPES).optional(),
  audience: z.enum(AUDIENCES).optional(),
  language: z.string().optional(),
  product_code: z.string().optional(),
  is_public: z.coerce.boolean().optional(),
  is_active: z.coerce.boolean().optional(),
  search: z.string().max(200).optional(),
  sort: z.enum(['created_at', 'sort_order', 'title_en']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type PatchAssetInput = z.infer<typeof patchAssetSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;

// ── Domain entity (DB row shape) ──────────────────────────────────

export interface AssetRow {
  asset_id: string;
  slug: string;
  title_en: string;
  title_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  asset_type: typeof ASSET_TYPES[number];
  product_code: string | null;
  language: string;
  audience: typeof AUDIENCES[number];
  tags: string[];
  storage_driver: string;
  storage_key: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  content_sha256: string | null;
  original_filename: string | null;
  is_public: boolean;
  is_active: boolean;
  allow_preview: boolean;
  allow_download: boolean;
  require_lead_capture: boolean;
  watermark_required: boolean;
  ingestion_status: typeof INGESTION_STATUSES[number];
  ingestion_error: string | null;
  ingestion_started_at: string | null;
  ingestion_finished_at: string | null;
  created_by_tenant: string | null;
  created_by_user: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
