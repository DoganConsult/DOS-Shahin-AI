export interface FoundationSodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const FOUNDATION_SOD_RULES: FoundationSodRule[] = [
  {
    ruleCode: 'fnd-sod-001',
    severity: 'critical',
    conflictingRoles: ['foundation.contributor', 'foundation.approver'],
    conflictingActions: ['foundation.record.write', 'foundation.record.approve'],
    descriptionEn: 'A user cannot both create and approve foundation changes',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد تغييرات الأساس في نفس الوقت',
  },
  {
    ruleCode: 'fnd-sod-002',
    severity: 'high',
    conflictingRoles: ['foundation.contributor', 'foundation.executive_owner'],
    conflictingActions: ['foundation.record.write', 'foundation.record.delete'],
    descriptionEn: 'A user cannot both create and delete foundation records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات الأساس في نفس الوقت',
  },
];
