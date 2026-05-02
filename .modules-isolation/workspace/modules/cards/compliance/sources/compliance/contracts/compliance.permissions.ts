/**
 * Public Compliance permission codes — frozen contract for peer-module gating.
 *
 * If a peer module needs to gate UI/API by compliance permissions, it MUST
 * import these constants instead of hardcoding string codes.
 */

export const COMPLIANCE_PERMISSION_CODES = {
  READ: 'compliance:read',
  WRITE: 'compliance:write',
  DELETE: 'compliance:delete',
  APPROVE: 'compliance:approve',
  MANAGE: 'compliance:manage',

  DOT_READ: 'compliance.read',
  DOT_MANAGE: 'compliance.manage',
  RECORD_READ: 'compliance.record.read',

  OBLIGATIONS_CREATE: 'compliance.obligations.create',
  OBLIGATIONS_READ: 'compliance.obligations.read',
  OBLIGATIONS_UPDATE: 'compliance.obligations.update',
  OBLIGATIONS_DELETE: 'compliance.obligations.delete',

  ANALYTICS_READ: 'compliance.analytics.read',
  GAPS_READ: 'compliance.gaps.read',
  GAPS_WRITE: 'compliance.gaps.write',

  CONTROLS_READ: 'compliance.controls.read',
  CONTROLS_WRITE: 'compliance.controls.write',
  CONTROLS_TEST: 'compliance.controls.test',

  ASSESSMENTS_READ: 'compliance.assessments.read',
  ASSESSMENTS_WRITE: 'compliance.assessments.write',

  ATTESTATION_READ: 'compliance.attestation.read',
  ATTESTATION_WRITE: 'compliance.attestation.write',

  REGULATORY_READ: 'compliance.regulatory.read',
  REGULATORY_SUBMIT: 'compliance.regulatory.submit',
} as const;

export type CompliancePermissionCode =
  (typeof COMPLIANCE_PERMISSION_CODES)[keyof typeof COMPLIANCE_PERMISSION_CODES];
