/**
 * Landing Page Context Catalog — DOS-AIO Law 4 Compliance
 *
 * These are UI display labels for the public landing page context selector.
 * They drive content filtering for unauthenticated visitors only.
 *
 * IMPORTANT:
 * - These are NOT security roles or permission scopes.
 * - These are NOT used for RBAC gating or authorization decisions.
 * - The canonical role authority lives in DAuth (backend) at runtime.
 * - To add/remove roles or sectors, update this file AND the corresponding
 *   backend `/api/public/context-catalog` endpoint.
 *
 * @see DOS-AIO.md Law 4: No Frontend-Invented Truth
 */

export interface ContextCatalogEntry {
  readonly key: string;
  readonly labelEn: string;
  readonly labelAr: string;
}

/** Sectors available for landing page content filtering */
export const LANDING_SECTORS: readonly ContextCatalogEntry[] = [
  { key: 'general', labelEn: 'General', labelAr: 'عام' },
  { key: 'banking', labelEn: 'Banking & Finance', labelAr: 'البنوك والتمويل' },
  { key: 'telecom', labelEn: 'Telecommunications', labelAr: 'الاتصالات' },
  { key: 'government', labelEn: 'Government', labelAr: 'القطاع الحكومي' },
  { key: 'healthcare', labelEn: 'Healthcare', labelAr: 'الرعاية الصحية' },
  { key: 'energy', labelEn: 'Energy & Utilities', labelAr: 'الطاقة والمرافق' },
  { key: 'education', labelEn: 'Education', labelAr: 'التعليم' },
] as const;

/** Persona roles for landing page content filtering (display only, NOT RBAC) */
export const LANDING_ROLES: readonly ContextCatalogEntry[] = [
  { key: 'general', labelEn: 'General', labelAr: 'عام' },
  { key: 'ciso', labelEn: 'CISO', labelAr: 'رئيس أمن المعلومات' },
  { key: 'compliance_officer', labelEn: 'Compliance Officer', labelAr: 'مسؤول الامتثال' },
  { key: 'risk_manager', labelEn: 'Risk Manager', labelAr: 'مدير المخاطر' },
  { key: 'auditor', labelEn: 'Auditor', labelAr: 'المدقق' },
  { key: 'executive', labelEn: 'Executive', labelAr: 'الإدارة العليا' },
] as const;

/** Maturity levels for landing page content filtering */
export const LANDING_MATURITIES = ['beginner', 'intermediate', 'advanced'] as const;
export type LandingMaturity = typeof LANDING_MATURITIES[number];
