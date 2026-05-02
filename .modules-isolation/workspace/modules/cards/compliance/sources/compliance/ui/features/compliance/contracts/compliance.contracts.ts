export interface ComplianceFrameworkContract {
  frameworkId: string;
  code: string;
  nameEn: string;
  nameAr: string | null;
  version: string;
  status: 'draft' | 'active' | 'suspended' | 'archived';
  obligationCount: number;
  controlMappingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceObligationContract {
  obligationId: string;
  frameworkId: string;
  code: string;
  nameEn: string;
  nameAr: string | null;
  state: 'draft' | 'active' | 'compliant' | 'non_compliant' | 'waived' | 'archived';
  ownerId: string | null;
  dueDate: string | null;
}

export interface ComplianceAssessmentContract {
  assessmentId: string;
  frameworkId: string;
  state: 'planned' | 'in_progress' | 'under_review' | 'completed' | 'cancelled';
  assessorId: string;
  score: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface ComplianceGapContract {
  gapId: string;
  frameworkId: string;
  obligationId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_remediation' | 'closed';
  detectedAt: string;
}

export interface ComplianceDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}
