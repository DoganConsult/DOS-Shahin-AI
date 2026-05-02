export interface LeadershipInsight {
  id: string;
  tenant_id: string;
  insight_type: InsightType;
  title: string;
  summary: string;
  severity: InsightSeverity;
  data: Record<string, unknown>;
  ai_generated: boolean;
  created_at: string;
  deleted_at?: string | null;
}

export type InsightType = 'risk_trend' | 'compliance_drift' | 'governance_gap' | 'strategic_opportunity' | 'anomaly';
export const INSIGHT_TYPES: readonly InsightType[] = ['risk_trend', 'compliance_drift', 'governance_gap', 'strategic_opportunity', 'anomaly'] as const;

export type InsightSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface LeadershipAlert {
  id: string;
  tenant_id: string;
  alert_type: string;
  title: string;
  message: string;
  severity: InsightSeverity;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  triggered_at: string;
  deleted_at?: string | null;
}

export interface ExecutiveBrief {
  tenantId: string;
  period: 'daily' | 'weekly' | 'monthly';
  generatedAt: string;
  riskSummary: { totalRisks: number; criticalRisks: number; trendDirection: 'improving' | 'stable' | 'deteriorating' };
  complianceSummary: { overallScore: number; gapCount: number; overdueObligations: number };
  governanceSummary: { pendingDecisions: number; overdueReviews: number };
  recommendations: string[];
  aiGenerated: boolean;
}

export interface ProactiveLeadershipEventPayload {
  tenantId: string;
  entityType: 'insight' | 'alert' | 'brief';
  entityId: string;
  moduleCode: 'proactive-leadership';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  data: Record<string, unknown>;
}
