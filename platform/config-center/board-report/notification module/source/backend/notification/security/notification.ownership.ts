interface NOTIFICATION_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const NOTIFICATION_OWNERSHIP_RULES: NOTIFICATION_OwnershipRule[] = [
  { entityType: 'notification_template', defaultOwnerRole: 'notification.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'notification_template entities require operator ownership' },
  { entityType: 'notification_rule', defaultOwnerRole: 'notification.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'notification_rule entities require operator ownership' },
];
