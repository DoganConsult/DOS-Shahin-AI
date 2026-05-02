export interface EvidenceItemContract {
  evidenceId: string;
  code: string;
  nameEn: string;
  nameAr: string | null;
  evidenceType: 'document' | 'screenshot' | 'log' | 'api_response' | 'attestation' | 'other';
  state: 'draft' | 'collected' | 'under_review' | 'approved' | 'expired' | 'archived';
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  collectedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface EvidenceCollectionContract {
  collectionId: string;
  name: string;
  state: 'planned' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  itemCount: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface EvidenceLinkageContract {
  linkageId: string;
  evidenceId: string;
  targetModule: string;
  targetEntityType: string;
  targetEntityId: string;
  linkedAt: string;
}

export interface EvidenceDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}
