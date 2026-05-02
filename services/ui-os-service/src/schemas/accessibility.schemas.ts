import { z } from 'zod';

export const AccessibilitySchema = z.object({
  screen_reader_optimized: z.boolean().optional(),
  keyboard_only: z.boolean().optional(),
  caption_required: z.boolean().optional(),
  tab_order_strict: z.boolean().optional(),
});

export const ReducedMotionSchema = z.object({
  reduce_motion: z.boolean().optional(),
  disable_parallax: z.boolean().optional(),
  disable_autoplay: z.boolean().optional(),
});

export const ContrastSchema = z.object({
  contrast_mode: z.enum(['default','high','inverted']),
});

export const FontScaleSchema = z.object({
  scale_percent: z.number().int().min(75).max(200),
});

export const DevicePreferenceSchema = z.object({
  device_kind: z.enum(['desktop','tablet','mobile','tv','watch']),
  prefers_compact: z.boolean().optional(),
  prefers_dark: z.boolean().optional(),
});

export const DeviceSessionSchema = z.object({
  device_id: z.string().min(1).max(120),
  device_kind: z.enum(['desktop','tablet','mobile','tv','watch']).nullable().optional(),
  user_agent: z.string().nullable().optional(),
  ip_hash: z.string().max(128).nullable().optional(),
});

export const ViewportProfileSchema = z.object({
  profile_code: z.string().min(1).max(40),
  breakpoint_kind: z.enum(['xs','sm','md','lg','xl','xxl']),
  min_width_px: z.number().int().positive(),
  max_width_px: z.number().int().positive().nullable().optional(),
  is_active: z.boolean().optional(),
});
