"use strict";
/**
 * PII Auto-Redaction Utility
 *
 * Content-level redaction for emails and phone numbers in arbitrary strings.
 * Complements the field-name-based Pino redact.paths (which handles known
 * fields like password, token, ssn).
 *
 * Usage:
 *   import { redactPii } from '@dos/platform-core/observability';
 *   logger.info(redactPii(`User ${email} logged in`));
 *
 * For objects:
 *   logger.info(redactPiiInObject({ msg: 'contact user@example.com', id: '123' }));
 *
 * Pipeline-side redaction via Vector transforms covers log stream output;
 * this utility covers explicit app-side redaction before logging.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactPii = redactPii;
exports.redactPiiInObject = redactPiiInObject;
// Precompiled patterns — compiled once, reused across calls
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_US_PATTERN = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
const PHONE_INTL_PATTERN = /\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
const EMAIL_REPLACEMENT = '[EMAIL-REDACTED]';
const PHONE_REPLACEMENT = '[PHONE-REDACTED]';
/**
 * Redact email addresses and phone numbers from a string value.
 * Returns the string with PII replaced by redaction markers.
 */
function redactPii(value) {
    if (!value || typeof value !== 'string')
        return value;
    return value
        .replace(EMAIL_PATTERN, EMAIL_REPLACEMENT)
        .replace(PHONE_INTL_PATTERN, PHONE_REPLACEMENT)
        .replace(PHONE_US_PATTERN, PHONE_REPLACEMENT);
}
/**
 * Shallow-walk an object's string values and apply PII redaction.
 * Only processes top-level string properties to avoid performance overhead.
 * Returns a new object (does not mutate the input).
 */
function redactPiiInObject(obj) {
    if (!obj || typeof obj !== 'object')
        return obj;
    const result = { ...obj };
    for (const key of Object.keys(result)) {
        const val = result[key];
        if (typeof val === 'string') {
            result[key] = redactPii(val);
        }
    }
    return result;
}
//# sourceMappingURL=pii-redact.js.map