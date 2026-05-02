interface WIDGETS_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const WIDGETS_OWNERSHIP_RULES: WIDGETS_OwnershipRule[] = [
  { entityType: 'widget_definition', defaultOwnerRole: 'widgets.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'widget_definition entities require operator ownership' },
  { entityType: 'widget_instance', defaultOwnerRole: 'widgets.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'widget_instance entities require operator ownership' },
];
