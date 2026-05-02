/**
 * Frontend role-permission map — used for navigation filtering.
 * Canonical permission truth lives in DAuth; this is for UI display only.
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  owner: ['*'],
  ciso: ['risk.*', 'compliance.*', 'governance.*', 'audit.*', 'incident.*', 'ai-governance.*', 'reports.*'],
  compliance_officer: ['compliance.*', 'controls.*', 'evidence.*', 'audit.*', 'reports.*'],
  risk_manager: ['risk.*', 'vendor.*', 'controls.*', 'incident.*'],
  auditor: ['audit.*', 'evidence.*', 'compliance.*', 'controls.*'],
  viewer: ['*.read'],
};
