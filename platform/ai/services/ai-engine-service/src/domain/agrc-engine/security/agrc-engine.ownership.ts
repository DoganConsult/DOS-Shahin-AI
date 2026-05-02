interface AGRC_ENGINE_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const AGRC_ENGINE_OWNERSHIP_RULES: AGRC_ENGINE_OwnershipRule[] = [
  { entityType: 'engine_rule', defaultOwnerRole: 'agrc-engine.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'engine_rule entities require operator ownership' },
  { entityType: 'engine_execution', defaultOwnerRole: 'agrc-engine.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'engine_execution entities require operator ownership' },
];
