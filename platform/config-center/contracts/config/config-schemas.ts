// Config OS — public schemas (Zod).
//
// Every config key in the system must be registered against one of these
// schemas. Free-form `Record<string, any>` config is forbidden (Phase C6
// `config:guards` enforces).

import { z } from 'zod';

// ──────────────────────────────────────────────────────────────────────
// Secret reference (NEVER value)
// ──────────────────────────────────────────────────────────────────────
export const SecretRefSchema = z.object({
  ref: z.string().min(1).describe('Opaque secret reference id'),
  provider: z.enum(['vault', 'env', 'aws-sm', 'gcp-sm', 'azure-kv']),
  path: z.string().min(1),
  rotationPolicy: z.string().optional(),
  ownerScope: z.enum(['platform', 'environment', 'product', 'module', 'tenant']),
  ownerId: z.string().optional(),
});
export type SecretRef = z.infer<typeof SecretRefSchema>;

// ──────────────────────────────────────────────────────────────────────
// Public runtime config — the ONLY shape a browser may receive
// ──────────────────────────────────────────────────────────────────────
export const PublicRuntimeConfigSchema = z.object({
  appEnv: z.enum(['production', 'staging', 'preview', 'development', 'test']),
  apiBaseUrl: z.string().url(),
  brandCode: z.string().min(1),
  productCode: z.string().min(1),
  uiOsVersion: z.string().optional(),
  sentryDsn: z.string().url().optional(),
  featureFlagsDefault: z.record(z.string(), z.boolean()).optional(),
}).strict();
export type PublicRuntimeConfig = z.infer<typeof PublicRuntimeConfigSchema>;

// ──────────────────────────────────────────────────────────────────────
// Trial config — Phase G (locked spec). Composed into both
// PlatformConfigSchema (defaults) and ProductConfigSchema (per-product
// override). Never hardcode trial duration in code — read from here.
// ──────────────────────────────────────────────────────────────────────
export const TrialConfigSchema = z.object({
  defaultDays: z.number().int().min(1).max(365).default(14),
  graceDays:   z.number().int().min(0).max(90).default(7),
  maxUsers:    z.number().int().min(1).optional(),
  allowedModules: z.array(z.string()).default([]),
  aiCredits:   z.number().int().min(0).optional(),
  requireCorporateEmail:    z.boolean().default(false),
  allowPublicEmailDomains:  z.boolean().default(true),
  oneTrialPerDomain:        z.boolean().default(true),
  disposableEmailBlocklist: z.array(z.string()).default([]),
}).strict();
export type TrialConfig = z.infer<typeof TrialConfigSchema>;

// ──────────────────────────────────────────────────────────────────────
// Platform scope — system-wide DNA defaults
// ──────────────────────────────────────────────────────────────────────
export const PlatformConfigSchema = z.object({
  enabledDnaModules: z.array(z.string()).default(['foundation']),
  authMode: z.enum(['cookie-session', 'bearer', 'mtls']).default('cookie-session'),
  uiOsVersion: z.string().default('1.0.0'),
  defaultLocales: z.array(z.string()).default(['ar', 'en']),
  featureFlagDefaults: z.record(z.string(), z.boolean()).default({}),
  observability: z.object({
    sentry: z.boolean().default(false),
    prometheus: z.boolean().default(true),
    pino: z.boolean().default(true),
  }).default({}),
  trial: TrialConfigSchema.partial().default({}),
}).strict();
export type PlatformConfig = z.infer<typeof PlatformConfigSchema>;

// ──────────────────────────────────────────────────────────────────────
// Environment scope — deployment targets
// ──────────────────────────────────────────────────────────────────────
export const EnvironmentConfigSchema = z.object({
  appEnv: z.enum(['production', 'staging', 'preview', 'development', 'test']),
  apiBaseUrl: z.string().url(),
  internalServiceUrls: z.record(z.string(), z.string().url()).default({}),
  publicRuntimeFlags: z.record(z.string(), z.boolean()).default({}),
  // Secrets here are stored as references only.
  secretRefs: z.array(SecretRefSchema).default([]),
}).strict();
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

// ──────────────────────────────────────────────────────────────────────
// Product scope — per-product composition
// ──────────────────────────────────────────────────────────────────────
export const ProductConfigSchema = z.object({
  productCode: z.string().min(1),
  displayName: z.string().min(1),
  hosts: z.array(z.string()).default([]),
  authMode: z.enum(['cookie-session', 'bearer', 'mtls']).optional(),
  themeOverride: z.string().optional(), // theme id or path
  // DB-driven only (dos.tenant_landing_config via UI-OS resolver). No
  // schema-level fallback — absence is representable.
  defaultRoute: z.string().nullable().optional(),
  enabledModules: z.array(z.object({
    moduleCode: z.string().min(1),
    version: z.string().min(1),
    scope: z.enum(['full', 'lite', 'preview']).default('full'),
  })).default([]),
  navigationComposition: z.object({
    primary: z.array(z.unknown()).default([]),
    secondary: z.array(z.unknown()).default([]),
  }).optional(),
  trial: TrialConfigSchema.partial().default({}),
}).strict();
export type ProductConfig = z.infer<typeof ProductConfigSchema>;

// ──────────────────────────────────────────────────────────────────────
// Module scope — per-module declarations
// ──────────────────────────────────────────────────────────────────────
export const ModuleConfigSchema = z.object({
  moduleCode: z.string().min(1),
  version: z.string().min(1),
  defaults: z.record(z.string(), z.unknown()).default({}),
  permissions: z.array(z.string()).default([]),
  routes: z.array(z.object({ path: z.string(), permission: z.string().optional() })).default([]),
  widgets: z.array(z.object({ widgetId: z.string(), permission: z.string().optional() })).default([]),
  forms: z.array(z.object({ formId: z.string(), schema: z.unknown() })).default([]),
  featureFlags: z.array(z.string()).default([]),
}).strict();
export type ModuleConfig = z.infer<typeof ModuleConfigSchema>;

// ──────────────────────────────────────────────────────────────────────
// Tenant scope — tenant-admin overrides
// ──────────────────────────────────────────────────────────────────────
export const TenantConfigSchema = z.object({
  tenantId: z.string().min(1),
  displayName: z.string().optional(),
  code: z.string().optional(),
  locale: z.string().default('en'),
  timezone: z.string().default('UTC'),
  currency: z.string().default('USD'),
  enabledModules: z.array(z.string()).default([]),  // moduleCodes from entitlements
  sectorPack: z.string().optional(),
  compliancePacks: z.array(z.string()).default([]),
  brandingOverride: z.object({
    logoUrl: z.string().url().optional(),
    primaryColor: z.string().optional(),
  }).optional(),
  workflowDefaults: z.record(z.string(), z.unknown()).default({}),
  notificationDefaults: z.record(z.string(), z.unknown()).default({}),
  dataRetentionDays: z.number().int().positive().optional(),
  allowedIntegrations: z.array(z.string()).default([]),
}).strict();
export type TenantConfig = z.infer<typeof TenantConfigSchema>;

// ──────────────────────────────────────────────────────────────────────
// User scope — end-user preferences
// ──────────────────────────────────────────────────────────────────────
export const UserConfigSchema = z.object({
  userId: z.string().min(1),
  tenantId: z.string().min(1),
  language: z.enum(['ar', 'en']).default('en'),
  direction: z.enum(['ltr', 'rtl']).default('ltr'),
  timezone: z.string().default('UTC'),
  dashboardLayout: z.record(z.string(), z.unknown()).optional(),
  notificationPreferences: z.record(z.string(), z.unknown()).default({}),
  tableDensity: z.enum(['compact', 'comfortable', 'spacious']).default('comfortable'),
  savedFilters: z.array(z.object({ key: z.string(), filter: z.unknown() })).default([]),
  accessibility: z.object({
    reducedMotion: z.boolean().default(false),
    highContrast: z.boolean().default(false),
    fontScale: z.number().min(0.75).max(2).default(1),
  }).default({}),
}).strict();
export type UserConfig = z.infer<typeof UserConfigSchema>;

// ──────────────────────────────────────────────────────────────────────
// Effective config — what the resolver returns
// ──────────────────────────────────────────────────────────────────────
export const EffectiveConfigSchema = z.object({
  platform:    PlatformConfigSchema.partial(),
  environment: EnvironmentConfigSchema.partial(),
  product:     ProductConfigSchema.partial(),
  modules:     z.record(z.string(), ModuleConfigSchema.partial()).default({}),
  tenant:      TenantConfigSchema.partial().optional(),
  user:        UserConfigSchema.partial().optional(),
  resolvedAt:  z.string(), // ISO-8601
}).strict();
export type EffectiveConfig = z.infer<typeof EffectiveConfigSchema>;
