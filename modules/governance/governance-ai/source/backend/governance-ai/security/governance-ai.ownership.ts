interface GOVERNANCE_AI_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const GOVERNANCE_AI_OWNERSHIP_RULES: GOVERNANCE_AI_OwnershipRule[] = [
  { entityType: 'governance_ai_model', defaultOwnerRole: 'governance-ai.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'governance_ai_model entities require operator ownership' },
  { entityType: 'governance_ai_assessment', defaultOwnerRole: 'governance-ai.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'governance_ai_assessment entities require operator ownership' },
];
