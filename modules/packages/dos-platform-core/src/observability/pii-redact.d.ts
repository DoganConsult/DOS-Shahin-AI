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
/**
 * Redact email addresses and phone numbers from a string value.
 * Returns the string with PII replaced by redaction markers.
 */
export declare function redactPii(value: string): string;
/**
 * Shallow-walk an object's string values and apply PII redaction.
 * Only processes top-level string properties to avoid performance overhead.
 * Returns a new object (does not mutate the input).
 */
export declare function redactPiiInObject<T extends Record<string, unknown>>(obj: T): T;
