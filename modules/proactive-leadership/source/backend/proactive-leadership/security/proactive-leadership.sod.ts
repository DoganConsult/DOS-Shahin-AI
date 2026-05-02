interface PROACTIVE_LEADERSHIP_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const PROACTIVE_LEADERSHIP_SOD_RULES: PROACTIVE_LEADERSHIP_SodRule[] = [
  {
    ruleCode: 'pld-sod-001',
    severity: 'critical',
    conflictingRoles: ['proactive-leadership.contributor', 'proactive-leadership.approver'],
    conflictingActions: ['proactive-leadership.record.write', 'proactive-leadership.record.approve'],
    descriptionEn: 'A user cannot both create and approve proactive-leadership records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات proactive-leadership في نفس الوقت',
  },
  {
    ruleCode: 'pld-sod-002',
    severity: 'high',
    conflictingRoles: ['proactive-leadership.contributor', 'proactive-leadership.executive_owner'],
    conflictingActions: ['proactive-leadership.record.write', 'proactive-leadership.record.delete'],
    descriptionEn: 'A user cannot both create and delete proactive-leadership records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات proactive-leadership في نفس الوقت',
  },
];
