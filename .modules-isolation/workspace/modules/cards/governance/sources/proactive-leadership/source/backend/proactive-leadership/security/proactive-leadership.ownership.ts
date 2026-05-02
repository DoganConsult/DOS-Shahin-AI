interface PROACTIVE_LEADERSHIP_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const PROACTIVE_LEADERSHIP_OWNERSHIP_RULES: PROACTIVE_LEADERSHIP_OwnershipRule[] = [
  { entityType: 'leadership_initiative', defaultOwnerRole: 'proactive-leadership.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'leadership_initiative entities require module lead ownership' },
  { entityType: 'leadership_objective', defaultOwnerRole: 'proactive-leadership.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'leadership_objective entities require module lead ownership' },
];
