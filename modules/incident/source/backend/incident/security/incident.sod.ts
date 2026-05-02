export interface INCIDENTSodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const INCIDENT_SOD_RULES: INCIDENTSodRule[] = [
  {
    ruleCode: 'inc-sod-001',
    severity: 'critical',
    conflictingRoles: ['incident.contributor', 'incident.approver'],
    conflictingActions: ['incident.record.write', 'incident.record.approve'],
    descriptionEn: 'A user cannot both create and approve incident records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات incident في نفس الوقت',
  },
  {
    ruleCode: 'inc-sod-002',
    severity: 'high',
    conflictingRoles: ['incident.contributor', 'incident.executive_owner'],
    conflictingActions: ['incident.record.write', 'incident.record.delete'],
    descriptionEn: 'A user cannot both create and delete incident records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات incident في نفس الوقت',
  },
];
