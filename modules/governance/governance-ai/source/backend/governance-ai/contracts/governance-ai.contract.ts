export interface GovernanceAiListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  signalType?: string;
  severity?: string;
  status?: string;
  sourceModule?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface GovernanceAiListResponse {
  success: boolean;
  data: GovernanceSignalContract[];
  total: number;
  page: number;
  limit: number;
  filters?: Record<string, unknown>;
}

export interface GovernanceAiDetailResponse {
  success: boolean;
  data: GovernanceSignalContract | null;
  interpretation?: SignalInterpretationContract;
  narrative?: EscalationNarrativeContract;
}

export interface GovernanceAiMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
  warnings?: string[];
}

export type SignalStatus = 'detected' | 'interpreting' | 'interpreted' | 'escalated' | 'resolved' | 'dismissed' | 'archived';
export type SignalSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export interface GovernanceSignalContract {
  signalId: string;
  tenantId: string;
  title: string;
  description?: string;
  signalType: 'anomaly' | 'trend' | 'threshold_breach' | 'pattern' | 'correlation' | 'predictive';
  status: SignalStatus;
  severity: SignalSeverity;
  confidence: number;
  sourceModule: string;
  sourceEntityId?: string;
  sourceMetricKey?: string;
  detectedAt: string;
  detectedBy: 'ml_model' | 'rule_engine' | 'statistical' | 'hybrid';
  modelId?: string;
  modelVersion?: string;
  linkedGovernanceEntityIds?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SignalInterpretationContract {
  interpretationId: string;
  signalId: string;
  summary: string;
  explanation: string;
  impactAssessment: string;
  affectedDomains: string[];
  suggestedActions: string[];
  confidenceScore: number;
  interpretedAt: string;
  interpretedBy: string;
  humanReviewRequired: boolean;
  humanReviewedBy?: string;
  humanReviewedAt?: string;
  humanOverride?: boolean;
  overrideReason?: string;
}

export interface EscalationNarrativeContract {
  narrativeId: string;
  signalId: string;
  narrativeType: 'executive_summary' | 'technical_detail' | 'board_report' | 'regulatory_notice';
  content: string;
  targetAudience: 'executive' | 'board' | 'operational' | 'technical' | 'regulatory';
  generatedAt: string;
  generatedBy: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  version: number;
}

export interface GovernanceAiModelContract {
  modelId: string;
  tenantId: string;
  modelName: string;
  modelType: 'anomaly_detection' | 'trend_analysis' | 'classification' | 'prediction';
  version: string;
  status: 'active' | 'training' | 'retired' | 'testing';
  accuracy?: number;
  lastTrainedAt?: string;
  dataSourceModules: string[];
  configuration: Record<string, unknown>;
}

export interface GovernanceAiDiagnosticsContract {
  tenantId: string;
  generatedAt: string;
  signalHealth: {
    unresolvedSignals: number;
    highSeverityUnresolved: number;
    staleSignals: number;
    falsePositiveRate: number;
  };
  interpretationHealth: {
    pendingInterpretation: number;
    pendingHumanReview: number;
    averageInterpretationTimeMs: number;
  };
  modelHealth: {
    activeModels: number;
    degradedModels: number;
    staleModels: number;
    averageAccuracy: number;
  };
  narrativeHealth: {
    pendingApproval: number;
    generationFailures: number;
  };
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface GovernanceAiDashboardSummaryContract {
  tenantId: string;
  generatedAt: string;
  signalStatusBreakdown: Record<SignalStatus, number>;
  severityBreakdown: Record<SignalSeverity, number>;
  signalTypeBreakdown: Record<string, number>;
  detectedToday: number;
  resolvedToday: number;
  escalatedCount: number;
  averageConfidence: number;
  modelPerformance: { modelId: string; accuracy: number; signalCount: number }[];
  trends: { date: string; detectedCount: number; resolvedCount: number }[];
}
