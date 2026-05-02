export interface PRIVACYOwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const PRIVACY_OWNERSHIP_RULES: PRIVACYOwnershipRule[] = [
  { entityType: 'data_processing', defaultOwnerRole: 'privacy.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'data_processing entities require module lead ownership' },
  { entityType: 'privacy_impact', defaultOwnerRole: 'privacy.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'privacy_impact entities require module lead ownership' },
  { entityType: 'consent_record', defaultOwnerRole: 'privacy.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'consent_record entities require module lead ownership' },
];
