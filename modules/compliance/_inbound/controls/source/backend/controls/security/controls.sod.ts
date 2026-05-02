export interface ControlsSodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const CONTROLS_SOD_RULES: ControlsSodRule[] = [
  {
    ruleCode: 'ctl-sod-001',
    severity: 'critical',
    conflictingRoles: ['controls.contributor', 'controls.approver'],
    conflictingActions: ['controls.record.write', 'controls.record.approve'],
    descriptionEn: 'A user cannot both create and approve control records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات الضوابط في نفس الوقت',
  },
  {
    ruleCode: 'ctl-sod-002',
    severity: 'high',
    conflictingRoles: ['controls.contributor', 'controls.executive_owner'],
    conflictingActions: ['controls.record.write', 'controls.record.delete'],
    descriptionEn: 'A user cannot both create and delete control records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات الضوابط في نفس الوقت',
  },
];
