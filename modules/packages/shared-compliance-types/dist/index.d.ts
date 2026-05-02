/**
 * Shared compliance domain types and constants.
 *
 * Source-of-truth enum for control statuses used by both backend services
 * and the SPA. The compliance-controls page imports COMPLIANCE_CONTROL_STATUSES
 * to populate filter chips and uses isControlStatus to validate API payloads.
 */
export declare const COMPLIANCE_CONTROL_STATUSES: readonly ["effective", "partial", "ineffective", "not_assessed", "not_applicable"];
export type ControlStatus = (typeof COMPLIANCE_CONTROL_STATUSES)[number];
export declare function isControlStatus(value: unknown): value is ControlStatus;
//# sourceMappingURL=index.d.ts.map