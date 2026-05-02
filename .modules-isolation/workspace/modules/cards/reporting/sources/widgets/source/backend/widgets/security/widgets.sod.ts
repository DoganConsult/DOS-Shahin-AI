interface WIDGETS_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const WIDGETS_SOD_RULES: WIDGETS_SodRule[] = [
  {
    ruleCode: 'wdg-sod-001',
    severity: 'critical',
    conflictingRoles: ['widgets.operator', 'widgets.viewer'],
    conflictingActions: ['widgets.record.write', 'widgets.record.approve'],
    descriptionEn: 'A user cannot both write and approve widgets records',
    descriptionAr: 'لا يمكن للمستخدم كتابة واعتماد سجلات widgets في نفس الوقت',
  },
  {
    ruleCode: 'wdg-sod-002',
    severity: 'high',
    conflictingRoles: ['widgets.operator'],
    conflictingActions: ['widgets.record.write', 'widgets.record.delete'],
    descriptionEn: 'A user cannot both write and delete widgets records',
    descriptionAr: 'لا يمكن للمستخدم كتابة وحذف سجلات widgets في نفس الوقت',
  },
];
