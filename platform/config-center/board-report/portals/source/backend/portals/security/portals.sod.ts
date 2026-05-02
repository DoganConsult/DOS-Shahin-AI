interface PORTALS_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const PORTALS_SOD_RULES: PORTALS_SodRule[] = [
  {
    ruleCode: 'ptl-sod-001',
    severity: 'critical',
    conflictingRoles: ['portals.contributor', 'portals.approver'],
    conflictingActions: ['portals.record.write', 'portals.record.approve'],
    descriptionEn: 'A user cannot both create and approve portals records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات portals في نفس الوقت',
  },
  {
    ruleCode: 'ptl-sod-002',
    severity: 'high',
    conflictingRoles: ['portals.contributor', 'portals.executive_owner'],
    conflictingActions: ['portals.record.write', 'portals.record.delete'],
    descriptionEn: 'A user cannot both create and delete portals records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات portals في نفس الوقت',
  },
];
