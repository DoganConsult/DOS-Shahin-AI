import { z } from 'zod';

export const PreferencePatchSchema = z.object({
  locale: z.string().min(2).max(20).optional(),
  timezone: z.string().min(1).max(64).optional(),
  direction: z.enum(['ltr', 'rtl']).optional(),
  appearance: z.enum(['light', 'dark', 'system']).optional(),
  density: z.enum(['compact', 'comfortable', 'spacious']).optional(),
  accent_color: z.string().max(20).nullable().optional(),
  default_module_code: z.string().max(100).nullable().optional(),
  preferences: z.record(z.unknown()).optional(),
});

export const LocalePatchSchema = z.object({
  locale: z.string().min(2).max(20),
  direction: z.enum(['ltr', 'rtl']).optional(),
});

export const ThemePatchSchema = z.object({
  appearance: z.enum(['light', 'dark', 'system']),
  accent_color: z.string().max(20).nullable().optional(),
});

export const DensityPatchSchema = z.object({
  density: z.enum(['compact', 'comfortable', 'spacious']),
});

export type PreferencePatchDto = z.infer<typeof PreferencePatchSchema>;
