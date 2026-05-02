export interface ProactiveLeadershipInsightContract {
  insightId: string;
  tenantId: string;
  insightType: 'risk_signal' | 'compliance_drift' | 'governance_health' | 'operational_anomaly' | 'strategic_opportunity' | 'executive_alert';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  titleEn: string;
  titleAr: string | null;
  summaryEn: string;
  summaryAr: string | null;
  sourceModules: string[];
  sourceData: Record<string, unknown>;
  status: 'new' | 'acknowledged' | 'actioned' | 'dismissed' | 'expired';
  confidenceScore: number | null;
  aiModelVersion: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProactiveLeadershipAlertContract {
  alertId: string;
  tenantId: string;
  insightId: string | null;
  alertType: 'threshold_breach' | 'trend_reversal' | 'sla_at_risk' | 'posture_degradation' | 'escalation_required';
  severity: 'critical' | 'high' | 'medium';
  titleEn: string;
  titleAr: string | null;
  messageEn: string;
  recipientIds: string[];
  deliveryChannels: ('inbox' | 'email' | 'sms' | 'push')[];
  status: 'pending' | 'delivered' | 'read' | 'actioned' | 'expired';
  triggeredAt: string;
  readAt: string | null;
}

export interface ProactiveLeadershipConfigContract {
  configId: string;
  tenantId: string;
  cycleFrequency: 'hourly' | 'daily' | 'weekly';
  insightRetentionDays: number;
  alertEnabled: boolean;
  alertSeverityThreshold: 'critical' | 'high' | 'medium';
  recipientRoles: string[];
  aiModelPreference: string | null;
  modulesMonitored: string[];
  updatedBy: string;
  updatedAt: string;
}

export interface ProactiveLeadershipExecutiveBriefContract {
  briefId: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  overallPostureScore: number;
  topInsights: ProactiveLeadershipInsightSummary[];
  riskTrend: 'improving' | 'stable' | 'declining';
  complianceTrend: 'improving' | 'stable' | 'declining';
  governanceTrend: 'improving' | 'stable' | 'declining';
  keyMetrics: Record<string, number>;
  generatedAt: string;
}

export interface ProactiveLeadershipInsightSummary {
  insightId: string;
  insightType: string;
  severity: string;
  titleEn: string;
  status: string;
}

export interface ProactiveLeadershipDiagnosticsContract {
  tenantId: string;
  totalInsights: number;
  newInsights: number;
  criticalInsights: number;
  acknowledgedRate: number | null;
  avgConfidenceScore: number | null;
  pendingAlerts: number;
  lastCycleAt: string | null;
  lastCycleStatus: string | null;
  capturedAt: string;
}

export interface ProactiveLeadershipListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  insightType?: string;
  severity?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProactiveLeadershipListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}
