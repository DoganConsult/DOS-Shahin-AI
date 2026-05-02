interface PACKS_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const PACKS_SOD_RULES: PACKS_SodRule[] = [
  {
    ruleCode: 'pck-sod-001',
    severity: 'critical',
    conflictingRoles: ['packs.operator', 'packs.viewer'],
    conflictingActions: ['packs.record.write', 'packs.record.approve'],
    descriptionEn: 'A user cannot both write and approve packs records',
    descriptionAr: 'لا يمكن للمستخدم كتابة واعتماد سجلات packs في نفس الوقت',
  },
  {
    ruleCode: 'pck-sod-002',
    severity: 'high',
    conflictingRoles: ['packs.operator'],
    conflictingActions: ['packs.record.write', 'packs.record.delete'],
    descriptionEn: 'A user cannot both write and delete packs records',
    descriptionAr: 'لا يمكن للمستخدم كتابة وحذف سجلات packs في نفس الوقت',
  },
];
