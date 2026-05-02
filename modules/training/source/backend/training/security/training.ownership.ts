interface TRAINING_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const TRAINING_OWNERSHIP_RULES: TRAINING_OwnershipRule[] = [
  { entityType: 'training_program', defaultOwnerRole: 'training.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'training_program entities require module lead ownership' },
  { entityType: 'training_session', defaultOwnerRole: 'training.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'training_session entities require module lead ownership' },
];
