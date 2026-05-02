export interface ControlsOwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const CONTROLS_OWNERSHIP_RULES: ControlsOwnershipRule[] = [
  { entityType: 'control', defaultOwnerRole: 'controls.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'Control entities require module lead ownership' },
  { entityType: 'control_test', defaultOwnerRole: 'controls.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'Control test entities require module lead ownership' },
  { entityType: 'control_objective', defaultOwnerRole: 'controls.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'Control objective entities require module lead ownership' },
];
