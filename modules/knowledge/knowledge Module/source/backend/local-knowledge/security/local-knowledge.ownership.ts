interface LOCAL_KNOWLEDGE_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const LOCAL_KNOWLEDGE_OWNERSHIP_RULES: LOCAL_KNOWLEDGE_OwnershipRule[] = [
  { entityType: 'knowledge_article', defaultOwnerRole: 'local-knowledge.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'knowledge_article entities require module lead ownership' },
  { entityType: 'knowledge_category', defaultOwnerRole: 'local-knowledge.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'knowledge_category entities require module lead ownership' },
];
