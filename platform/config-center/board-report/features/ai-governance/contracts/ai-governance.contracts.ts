export interface AiModelRegistryContract {
  modelId: string;
  name: string;
  provider: string;
  version: string;
  state: 'draft' | 'in_review' | 'approved' | 'deployed' | 'monitoring' | 'suspended' | 'retired' | 'archived';
  riskTier: 'low' | 'medium' | 'high' | 'critical';
  lastAssessedAt: string | null;
  createdAt: string;
}

export interface AiRiskAssessmentContract {
  assessmentId: string;
  modelId: string;
  state: 'planned' | 'in_progress' | 'under_review' | 'completed' | 'cancelled';
  riskScore: number | null;
  assessorId: string;
  createdAt: string;
  completedAt: string | null;
}

export interface AiBiasMonitorContract {
  monitorId: string;
  modelId: string;
  metricName: string;
  currentValue: number;
  threshold: number;
  breached: boolean;
  lastCheckedAt: string;
}

export interface AiGovernanceDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}
