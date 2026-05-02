interface INTEGRATIONS_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const INTEGRATIONS_OWNERSHIP_RULES: INTEGRATIONS_OwnershipRule[] = [
  { entityType: 'integration_config', defaultOwnerRole: 'integrations.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'integration_config entities require module lead ownership' },
  { entityType: 'integration_connection', defaultOwnerRole: 'integrations.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'integration_connection entities require module lead ownership' },
];
