/**
 * Enterprise GDPR / PDPL Data Erasure Service.
 * Irrecoverably scrambles User PII (email, names, phone) while preserving
 * UUID referential integrity so historical workflow logs are not corrupted.
 */
export declare function anonymizeUser(tenantId: string, userId: string, requestedBy: string): Promise<boolean>;
