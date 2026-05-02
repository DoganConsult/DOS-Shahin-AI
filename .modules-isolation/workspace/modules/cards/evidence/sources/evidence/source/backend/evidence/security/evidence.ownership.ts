export interface EVIDENCEOwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const EVIDENCE_OWNERSHIP_RULES: EVIDENCEOwnershipRule[] = [
  { entityType: 'evidence_item', defaultOwnerRole: 'evidence.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'evidence_item entities require module lead ownership' },
  { entityType: 'evidence_request', defaultOwnerRole: 'evidence.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'evidence_request entities require module lead ownership' },
  { entityType: 'evidence_review', defaultOwnerRole: 'evidence.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'evidence_review entities require module lead ownership' },
];
