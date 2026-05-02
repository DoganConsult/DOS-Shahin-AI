interface ANALYTICS_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const ANALYTICS_SOD_RULES: ANALYTICS_SodRule[] = [
  {
    ruleCode: 'anl-sod-001',
    severity: 'critical',
    conflictingRoles: ['analytics.operator', 'analytics.viewer'],
    conflictingActions: ['analytics.record.write', 'analytics.record.approve'],
    descriptionEn: 'A user cannot both write and approve analytics records',
    descriptionAr: 'لا يمكن للمستخدم كتابة واعتماد سجلات analytics في نفس الوقت',
  },
  {
    ruleCode: 'anl-sod-002',
    severity: 'high',
    conflictingRoles: ['analytics.operator'],
    conflictingActions: ['analytics.record.write', 'analytics.record.delete'],
    descriptionEn: 'A user cannot both write and delete analytics records',
    descriptionAr: 'لا يمكن للمستخدم كتابة وحذف سجلات analytics في نفس الوقت',
  },
];
