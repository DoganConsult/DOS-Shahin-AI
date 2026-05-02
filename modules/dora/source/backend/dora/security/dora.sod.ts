export interface DoraSodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const DORA_SOD_RULES: DoraSodRule[] = [
  {
    ruleCode: 'dra-sod-001',
    severity: 'critical',
    conflictingRoles: ['dora.contributor', 'dora.approver'],
    conflictingActions: ['dora.record.write', 'dora.record.approve'],
    descriptionEn: 'A user cannot both create and approve DORA records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات DORA في نفس الوقت',
  },
  {
    ruleCode: 'dra-sod-002',
    severity: 'high',
    conflictingRoles: ['dora.contributor', 'dora.executive_owner'],
    conflictingActions: ['dora.record.write', 'dora.record.delete'],
    descriptionEn: 'A user cannot both create and delete DORA records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات DORA في نفس الوقت',
  },
];
