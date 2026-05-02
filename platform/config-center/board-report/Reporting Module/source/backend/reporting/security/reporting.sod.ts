interface REPORTING_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const REPORTING_SOD_RULES: REPORTING_SodRule[] = [
  {
    ruleCode: 'rpt-sod-001',
    severity: 'critical',
    conflictingRoles: ['reporting.operator', 'reporting.viewer'],
    conflictingActions: ['reporting.record.write', 'reporting.record.approve'],
    descriptionEn: 'A user cannot both write and approve reporting records',
    descriptionAr: 'لا يمكن للمستخدم كتابة واعتماد سجلات reporting في نفس الوقت',
  },
  {
    ruleCode: 'rpt-sod-002',
    severity: 'high',
    conflictingRoles: ['reporting.operator'],
    conflictingActions: ['reporting.record.write', 'reporting.record.delete'],
    descriptionEn: 'A user cannot both write and delete reporting records',
    descriptionAr: 'لا يمكن للمستخدم كتابة وحذف سجلات reporting في نفس الوقت',
  },
];
