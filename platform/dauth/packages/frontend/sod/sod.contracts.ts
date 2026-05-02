export interface SodRuleContract {
  ruleId: string;
  name: string;
  description: string;
  conflictingPermissions: [string, string];
  severity: 'critical' | 'high' | 'medium' | 'low';
  enforcement: 'block' | 'warn' | 'audit_only';
  active: boolean;
}

export interface SodViolationContract {
  violationId: string;
  ruleId: string;
  userId: string;
  conflictingRoles: string[];
  detectedAt: string;
  status: 'open' | 'mitigated' | 'accepted' | 'resolved';
  mitigationNote?: string;
}

export interface SodCheckResultContract {
  passed: boolean;
  violations: SodViolationContract[];
  checkedAt: string;
}
