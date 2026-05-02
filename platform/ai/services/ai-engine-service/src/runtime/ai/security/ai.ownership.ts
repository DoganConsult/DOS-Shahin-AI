interface AI_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const AI_OWNERSHIP_RULES: AI_OwnershipRule[] = [
  { entityType: 'ai_agent', defaultOwnerRole: 'ai.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'ai_agent entities require module lead ownership' },
  { entityType: 'ai_conversation', defaultOwnerRole: 'ai.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'ai_conversation entities require module lead ownership' },
];
