/**
 * Shared compliance domain types and constants.
 *
 * Source-of-truth enum for control statuses used by both backend services
 * and the SPA. The compliance-controls page imports COMPLIANCE_CONTROL_STATUSES
 * to populate filter chips and uses isControlStatus to validate API payloads.
 */
export const COMPLIANCE_CONTROL_STATUSES = [
  'effective',
  'partial',
  'ineffective',
  'not_assessed',
  'not_applicable',
] as const;

export type ControlStatus = (typeof COMPLIANCE_CONTROL_STATUSES)[number];

export function isControlStatus(value: unknown): value is ControlStatus {
  return (
    typeof value === 'string' &&
    (COMPLIANCE_CONTROL_STATUSES as readonly string[]).includes(value)
  );
}
