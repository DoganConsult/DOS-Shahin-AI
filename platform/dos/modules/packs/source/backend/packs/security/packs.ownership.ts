interface PACKS_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const PACKS_OWNERSHIP_RULES: PACKS_OwnershipRule[] = [
  { entityType: 'pack_definition', defaultOwnerRole: 'packs.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'pack_definition entities require operator ownership' },
  { entityType: 'pack_assignment', defaultOwnerRole: 'packs.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'pack_assignment entities require operator ownership' },
];
