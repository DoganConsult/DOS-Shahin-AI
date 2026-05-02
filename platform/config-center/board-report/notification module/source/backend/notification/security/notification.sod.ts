interface NOTIFICATION_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const NOTIFICATION_SOD_RULES: NOTIFICATION_SodRule[] = [
  {
    ruleCode: 'ntf-sod-001',
    severity: 'critical',
    conflictingRoles: ['notification.operator', 'notification.viewer'],
    conflictingActions: ['notification.record.write', 'notification.record.approve'],
    descriptionEn: 'A user cannot both write and approve notification records',
    descriptionAr: 'لا يمكن للمستخدم كتابة واعتماد سجلات notification في نفس الوقت',
  },
  {
    ruleCode: 'ntf-sod-002',
    severity: 'high',
    conflictingRoles: ['notification.operator'],
    conflictingActions: ['notification.record.write', 'notification.record.delete'],
    descriptionEn: 'A user cannot both write and delete notification records',
    descriptionAr: 'لا يمكن للمستخدم كتابة وحذف سجلات notification في نفس الوقت',
  },
];
