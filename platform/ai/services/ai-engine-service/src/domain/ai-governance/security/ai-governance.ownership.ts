interface AI_GOVERNANCE_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const AI_GOVERNANCE_OWNERSHIP_RULES: AI_GOVERNANCE_OwnershipRule[] = [
  { entityType: 'ai_model', defaultOwnerRole: 'ai-governance.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'ai_model entities require module lead ownership' },
  { entityType: 'ai_risk_assessment', defaultOwnerRole: 'ai-governance.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'ai_risk_assessment entities require module lead ownership' },
];
