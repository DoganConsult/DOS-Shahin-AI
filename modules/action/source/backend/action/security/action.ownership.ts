export interface ACTIONOwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const ACTION_OWNERSHIP_RULES: ACTIONOwnershipRule[] = [
  { entityType: 'action_plan', defaultOwnerRole: 'action.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'action_plan entities require module lead ownership' },
  { entityType: 'action_task', defaultOwnerRole: 'action.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'action_task entities require module lead ownership' },
  { entityType: 'action_item', defaultOwnerRole: 'action.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'action_item entities require module lead ownership' },
];
