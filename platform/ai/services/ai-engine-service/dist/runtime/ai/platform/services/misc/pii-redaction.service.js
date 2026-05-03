/**
 * pii-redaction.service — minimal in-engine implementation.
 *
 * @owner AI
 * Tenants may opt in/out of automatic PII redaction via a config flag.
 * The platform-wide canonical service (modules/platform/services/misc/) is
 * not yet wired; this file provides the contract surface so callers compile
 * and degrade safely until the platform service replaces it.
 */
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\b(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}\b/g;
const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g;
const NATIONAL_ID_RE = /\b\d{9,12}\b/g;
export function redactPII(text) {
    if (!text)
        return { text: text ?? '', redactedCount: 0 };
    let count = 0;
    let out = text;
    for (const re of [EMAIL_RE, PHONE_RE, IBAN_RE, NATIONAL_ID_RE]) {
        out = out.replace(re, () => { count++; return '[REDACTED]'; });
    }
    return { text: out, redactedCount: count };
}
/**
 * Decide whether content stored against a given (tenant, user) pair must be
 * redacted before persistence. Currently always returns false until tenant
 * privacy preferences are wired through Config OS — but the call signature is
 * preserved so consumers do not need to change when that lands.
 */
export async function shouldRedactForUser(_tenantId, _userId) {
    return false;
}
//# sourceMappingURL=pii-redaction.service.js.map