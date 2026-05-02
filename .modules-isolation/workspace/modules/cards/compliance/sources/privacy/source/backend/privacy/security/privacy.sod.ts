export interface PRIVACYSodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const PRIVACY_SOD_RULES: PRIVACYSodRule[] = [
  {
    ruleCode: 'prv-sod-001',
    severity: 'critical',
    conflictingRoles: ['privacy.contributor', 'privacy.approver'],
    conflictingActions: ['privacy.record.write', 'privacy.record.approve'],
    descriptionEn: 'A user cannot both create and approve privacy records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات privacy في نفس الوقت',
  },
  {
    ruleCode: 'prv-sod-002',
    severity: 'high',
    conflictingRoles: ['privacy.contributor', 'privacy.executive_owner'],
    conflictingActions: ['privacy.record.write', 'privacy.record.delete'],
    descriptionEn: 'A user cannot both create and delete privacy records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات privacy في نفس الوقت',
  },
];
