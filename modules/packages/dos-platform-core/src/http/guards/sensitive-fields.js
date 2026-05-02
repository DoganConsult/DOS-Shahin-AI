"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FINANCIAL_PATTERNS = exports.GRC_SENSITIVE_PATTERNS = exports.PII_PATTERNS = exports.RESTRICTED_PATTERNS = exports.PII_VALUE_PATTERNS = void 0;
exports.registerModuleSensitiveFields = registerModuleSensitiveFields;
exports.classifyFieldSensitivity = classifyFieldSensitivity;
exports.isRestrictedField = isRestrictedField;
exports.isSensitiveField = isSensitiveField;
exports.fieldPermissionCode = fieldPermissionCode;
exports.redactPIIValues = redactPIIValues;
// ── Core restricted patterns (never exposed) ────────────────────────────
const RESTRICTED_PATTERNS = [
    { pattern: /^ssn$|social_security/i, level: 'restricted', description: 'SSN / Social Security' },
    { pattern: /password|secret|token|api_key/i, level: 'restricted', description: 'Credentials / Secrets' },
    { pattern: /credit_card|card_number/i, level: 'restricted', description: 'Payment card data' },
    { pattern: /bank_account|iban|routing_number/i, level: 'restricted', description: 'Bank account identifiers' },
    { pattern: /private_key|encryption_key/i, level: 'restricted', description: 'Cryptographic keys' },
];
exports.RESTRICTED_PATTERNS = RESTRICTED_PATTERNS;
// ── PII patterns ─────────────────────────────────────────────────────────
const PII_PATTERNS = [
    { pattern: /national_id|passport|driver_license/i, level: 'pii', description: 'Government IDs' },
    { pattern: /phone|mobile|fax/i, level: 'pii', description: 'Phone numbers' },
    { pattern: /^email$/i, level: 'pii', description: 'Email address' },
    { pattern: /address|postal_code|zip_code/i, level: 'pii', description: 'Physical address' },
    { pattern: /date_of_birth|dob|birth_date/i, level: 'pii', description: 'Date of birth' },
    { pattern: /medical|health|diagnosis/i, level: 'pii', description: 'Health/medical data' },
    { pattern: /salary|compensation|pay_rate|wage/i, level: 'pii', description: 'Compensation data' },
    { pattern: /whistleblower_identity|informant/i, level: 'pii', description: 'Whistleblower identity' },
];
exports.PII_PATTERNS = PII_PATTERNS;
// ── GRC-specific sensitive patterns ─────────────────────────────────────
const GRC_SENSITIVE_PATTERNS = [
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
exports.GRC_SENSITIVE_PATTERNS = GRC_SENSITIVE_PATTERNS;
// ── Financial patterns ──────────────────────────────────────────────────
const FINANCIAL_PATTERNS = [
    { pattern: /penalty_amount|fine_amount/i, level: 'financial', description: 'Regulatory penalties' },
    { pattern: /^amount$|^cost$|^price$|^budget$|^revenue$|^profit$/i, level: 'financial', description: 'Financial amounts' },
    { pattern: /financial_kpi/i, level: 'financial', description: 'Financial KPI' },
    { pattern: /insurance_coverage|claim_amount/i, level: 'financial', description: 'Insurance/claim data' },
];
exports.FINANCIAL_PATTERNS = FINANCIAL_PATTERNS;
// ── Combined registry ───────────────────────────────────────────────────
const _allPatterns = [
    ...RESTRICTED_PATTERNS,
    ...PII_PATTERNS,
    ...GRC_SENSITIVE_PATTERNS,
    ...FINANCIAL_PATTERNS,
];
// Module-specific extensions
const _moduleExtensions = new Map();
/**
 * Register additional sensitive fields for a specific module.
 * Called at module startup to extend the canonical registry.
 */
function registerModuleSensitiveFields(moduleCode, fields) {
    const existing = _moduleExtensions.get(moduleCode) || [];
    _moduleExtensions.set(moduleCode, [...existing, ...fields]);
}
/**
 * Classify a field name and return its sensitivity level, or null if not sensitive.
 * Checks canonical patterns first, then module-specific extensions.
 */
function classifyFieldSensitivity(fieldName, moduleCode) {
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
function isRestrictedField(fieldName) {
    const cls = classifyFieldSensitivity(fieldName);
    return cls?.level === 'restricted';
}
/**
 * Check if a field is sensitive at any level.
 */
function isSensitiveField(fieldName, moduleCode) {
    return classifyFieldSensitivity(fieldName, moduleCode) !== null;
}
/**
 * Generate the permission code required to view a sensitive field.
 */
function fieldPermissionCode(moduleCode, fieldName) {
    const cls = classifyFieldSensitivity(fieldName, moduleCode);
    if (!cls)
        return null;
    return `${moduleCode}.field.${fieldName}.read`;
}
/**
 * PII value-level patterns for in-line redaction of data values.
 */
exports.PII_VALUE_PATTERNS = [
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
function redactPIIValues(text) {
    let result = text;
    for (const { regex, replacement } of exports.PII_VALUE_PATTERNS) {
        regex.lastIndex = 0;
        result = result.replace(regex, replacement);
    }
    return result;
}
//# sourceMappingURL=sensitive-fields.js.map