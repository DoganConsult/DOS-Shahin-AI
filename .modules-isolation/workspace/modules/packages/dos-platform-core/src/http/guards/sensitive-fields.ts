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

// ── Core restricted patterns (never exposed) ────────────────────────────
const RESTRICTED_PATTERNS: SensitiveFieldEntry[] = [
  { pattern: /^ssn$|social_security/i, level: 'restricted', description: 'SSN / Social Security' },
  { pattern: /password|secret|token|api_key/i, level: 'restricted', description: 'Credentials / Secrets' },
  { pattern: /credit_card|card_number/i, level: 'restricted', description: 'Payment card data' },
  { pattern: /bank_account|iban|routing_number/i, level: 'restricted', description: 'Bank account identifiers' },
  { pattern: /private_key|encryption_key/i, level: 'restricted', description: 'Cryptographic keys' },
];

// ── PII patterns ─────────────────────────────────────────────────────────
const PII_PATTERNS: SensitiveFieldEntry[] = [
  { pattern: /national_id|passport|driver_license/i, level: 'pii', description: 'Government IDs' },
  { pattern: /phone|mobile|fax/i, level: 'pii', description: 'Phone numbers' },
  { pattern: /^email$/i, level: 'pii', description: 'Email address' },
  { pattern: /address|postal_code|zip_code/i, level: 'pii', description: 'Physical address' },
  { pattern: /date_of_birth|dob|birth_date/i, level: 'pii', description: 'Date of birth' },
  { pattern: /medical|health|diagnosis/i, level: 'pii', description: 'Health/medical data' },
  { pattern: /salary|compensation|pay_rate|wage/i, level: 'pii', description: 'Compensation data' },
  { pattern: /whistleblower_identity|informant/i, level: 'pii', description: 'Whistleblower identity' },
];

// ── GRC-specific sensitive patterns ─────────────────────────────────────
const GRC_SENSITIVE_PATTERNS: SensitiveFieldEntry[] = [
  { pattern: /risk_appetite/i, level: 'grc_sensitive', description: 'Risk appetite thresholds' },
  { pattern: /control_effectiveness_score/i, level: 'grc_sensitive', description: 'Control effectiveness metrics' },
  { pattern: /vulnerability_detail/i, level: 'grc_sensitive', description: 'Vulnerability details' },
  { pattern: /incident_root_cause/i, level: 'grc_sensitive', description: 'Incident root cause analysis' },
  { pattern: /investigation_notes/i, level: 'grc_sensitive', description: 'Investigation notes' },
  { pattern: /internal_notes|audit_findings_internal/i, level: 'grc_sensitive', description: 'Internal findings/notes' },
  { pattern: /risk_score_raw/i, level: 'grc_sensitive', description: 'Raw risk scores' },
  { pattern: /security_clearance|classification_level/i, level: 'grc_sensitive', description: 'Security classification' },
  { pattern: /penetration_test|pentest/i, level: 'grc_sensitive', description: 'Penetration test results' },
  { pattern: /gap_analysis_detail/i, level: 'grc_sensitive', description: 'Gap analysis findings' },
  { pattern: /remediation_cost|remediation_budget/i, level: 'grc_sensitive', description: 'Remediation financials' },
  { pattern: /threat_intelligence/i, level: 'grc_sensitive', description: 'Threat intelligence data' },
  { pattern: /compliance_gap_score/i, level: 'grc_sensitive', description: 'Compliance gap metrics' },
];

// ── Financial patterns ──────────────────────────────────────────────────
const FINANCIAL_PATTERNS: SensitiveFieldEntry[] = [
  { pattern: /penalty_amount|fine_amount/i, level: 'financial', description: 'Regulatory penalties' },
  { pattern: /^amount$|^cost$|^price$|^budget$|^revenue$|^profit$/i, level: 'financial', description: 'Financial amounts' },
  { pattern: /financial_kpi/i, level: 'financial', description: 'Financial KPI' },
  { pattern: /insurance_coverage|claim_amount/i, level: 'financial', description: 'Insurance/claim data' },
];

// ── Combined registry ───────────────────────────────────────────────────
const _allPatterns: SensitiveFieldEntry[] = [
  ...RESTRICTED_PATTERNS,
  ...PII_PATTERNS,
  ...GRC_SENSITIVE_PATTERNS,
  ...FINANCIAL_PATTERNS,
];

// Module-specific extensions
const _moduleExtensions = new Map<string, SensitiveFieldEntry[]>();

/**
 * Register additional sensitive fields for a specific module.
 * Called at module startup to extend the canonical registry.
 */
export function registerModuleSensitiveFields(moduleCode: string, fields: SensitiveFieldEntry[]): void {
  const existing = _moduleExtensions.get(moduleCode) || [];
  _moduleExtensions.set(moduleCode, [...existing, ...fields]);
}

/**
 * Classify a field name and return its sensitivity level, or null if not sensitive.
 * Checks canonical patterns first, then module-specific extensions.
 */
export function classifyFieldSensitivity(
  fieldName: string,
  moduleCode?: string,
): { level: SensitivityLevel; description: string } | null {
  for (const entry of _allPatterns) {
    if (entry.pattern.test(fieldName)) {
      return { level: entry.level, description: entry.description };
    }
  }
  if (moduleCode) {
    const moduleFields = _moduleExtensions.get(moduleCode);
    if (moduleFields) {
      for (const entry of moduleFields) {
        if (entry.pattern.test(fieldName)) {
          return { level: entry.level, description: entry.description };
        }
      }
    }
  }
  return null;
}

/**
 * Check if a field is restricted (should never be exposed).
 */
export function isRestrictedField(fieldName: string): boolean {
  const cls = classifyFieldSensitivity(fieldName);
  return cls?.level === 'restricted';
}

/**
 * Check if a field is sensitive at any level.
 */
export function isSensitiveField(fieldName: string, moduleCode?: string): boolean {
  return classifyFieldSensitivity(fieldName, moduleCode) !== null;
}

/**
 * Generate the permission code required to view a sensitive field.
 */
export function fieldPermissionCode(moduleCode: string, fieldName: string): string | null {
  const cls = classifyFieldSensitivity(fieldName, moduleCode);
  if (!cls) return null;
  return `${moduleCode}.field.${fieldName}.read`;
}

/**
 * PII value-level patterns for in-line redaction of data values.
 */
export const PII_VALUE_PATTERNS: { regex: RegExp; replacement: string }[] = [
  { regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: '[REDACTED_CC]' },
  { regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED_SSN]' },
  { regex: /\b[12]\d{9}\b/g, replacement: '[REDACTED_NID]' },
  { regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g, replacement: '[REDACTED_IBAN]' },
  // Allow `_` and `-` inside the 16+ character tail so typical issued
  // secret shapes like `sk_live_abc123def456...` (Stripe-style) and
  // `api-key-xxxx-xxxx-xxxx` match. Without `_`/`-` the tail breaks at
  // the first separator and the full secret is left un-redacted.
  { regex: /\b(sk|pk|api|key|token|secret|password)[_-]?[A-Za-z0-9][A-Za-z0-9_-]{15,}\b/gi, replacement: '[REDACTED_KEY]' },
  { regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, replacement: '[REDACTED_JWT]' },
  // Arabic-format national ID (Saudi)
  { regex: /\b[12]\d{9}\b/g, replacement: '[REDACTED_SA_NID]' },
  // Arabic-format phone numbers
  { regex: /\b(?:\+?966|0)5\d{8}\b/g, replacement: '[REDACTED_SA_PHONE]' },
];

/**
 * Redact PII values in a string without exposing the original data.
 */
export function redactPIIValues(text: string): string {
  let result = text;
  for (const { regex, replacement } of PII_VALUE_PATTERNS) {
    regex.lastIndex = 0;
    result = result.replace(regex, replacement);
  }
  return result;
}

export { RESTRICTED_PATTERNS, PII_PATTERNS, GRC_SENSITIVE_PATTERNS, FINANCIAL_PATTERNS };
