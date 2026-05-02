export interface KnowledgeSodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const KNOWLEDGE_SOD_RULES: KnowledgeSodRule[] = [
  {
    ruleCode: 'kb-sod-001',
    severity: 'critical',
    conflictingRoles: ['knowledge.contributor', 'knowledge.approver'],
    conflictingActions: ['knowledge.article.write', 'knowledge.article.publish'],
    descriptionEn: 'An author cannot approve or publish their own article',
    descriptionAr: 'لا يمكن للمؤلف اعتماد أو نشر مقاله الخاص',
  },
  {
    ruleCode: 'kb-sod-002',
    severity: 'high',
    conflictingRoles: ['knowledge.contributor', 'knowledge.executive_owner'],
    conflictingActions: ['knowledge.article.write', 'knowledge.article.delete'],
    descriptionEn: 'An author cannot delete their own published article',
    descriptionAr: 'لا يمكن للمؤلف حذف مقاله المنشور',
  },
];
