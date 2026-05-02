/**
 * Canonical Sensitive Field Registry
 * Single source of truth for field sensitivity classification across all modules.
 *
 * Categories:
 * - RESTRICTED: Never exposed (passwords, tokens, secrets) — always stripped
 * - PII: Personal Identifiable Information — redacted for unauthorized users
 * - GRC_SENSITIVE: Domain-sensitive fields specific to GRC/compliance context
 * - FINANCIAL: Financial/monetary fields requiring elevated access
 *
 * Modules may register additional fields via registerModuleSensitiveFields().
 */
export type SensitivityLevel = 'restricted' | 'pii' | 'grc_sensitive' | 'financial';
export interface SensitiveFieldEntry {
    pattern: RegExp;
    level: SensitivityLevel;
    description: string;
}
declare const RESTRICTED_PATTERNS: SensitiveFieldEntry[];
declare const PII_PATTERNS: SensitiveFieldEntry[];
declare const GRC_SENSITIVE_PATTERNS: SensitiveFieldEntry[];
declare const FINANCIAL_PATTERNS: SensitiveFieldEntry[];
/**
 * Register additional sensitive fields for a specific module.
 * Called at module startup to extend the canonical registry.
 */
export declare function registerModuleSensitiveFields(moduleCode: string, fields: SensitiveFieldEntry[]): void;
/**
 * Classify a field name and return its sensitivity level, or null if not sensitive.
 * Checks canonical patterns first, then module-specific extensions.
 */
export declare function classifyFieldSensitivity(fieldName: string, moduleCode?: string): {
    level: SensitivityLevel;
    description: string;
} | null;
/**
 * Check if a field is restricted (should never be exposed).
 */
export declare function isRestrictedField(fieldName: string): boolean;
/**
 * Check if a field is sensitive at any level.
 */
export declare function isSensitiveField(fieldName: string, moduleCode?: string): boolean;
/**
 * Generate the permission code required to view a sensitive field.
 */
export declare function fieldPermissionCode(moduleCode: string, fieldName: string): string | null;
/**
 * PII value-level patterns for in-line redaction of data values.
 */
export declare const PII_VALUE_PATTERNS: {
    regex: RegExp;
    replacement: string;
}[];
/**
 * Redact PII values in a string without exposing the original data.
 */
export declare function redactPIIValues(text: string): string;
export { RESTRICTED_PATTERNS, PII_PATTERNS, GRC_SENSITIVE_PATTERNS, FINANCIAL_PATTERNS };
