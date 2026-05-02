interface INBOX_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const INBOX_OWNERSHIP_RULES: INBOX_OwnershipRule[] = [
  { entityType: 'inbox_item', defaultOwnerRole: 'inbox.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'inbox_item entities require operator ownership' },
  { entityType: 'inbox_rule', defaultOwnerRole: 'inbox.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'inbox_rule entities require operator ownership' },
];
