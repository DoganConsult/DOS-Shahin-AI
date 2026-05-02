export interface INCIDENTOwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const INCIDENT_OWNERSHIP_RULES: INCIDENTOwnershipRule[] = [
  { entityType: 'incident', defaultOwnerRole: 'incident.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'incident entities require module lead ownership' },
  { entityType: 'investigation', defaultOwnerRole: 'incident.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'investigation entities require module lead ownership' },
  { entityType: 'root_cause', defaultOwnerRole: 'incident.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'root_cause entities require module lead ownership' },
];
