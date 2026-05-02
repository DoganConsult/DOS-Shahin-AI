export type LeadershipInsightStatus = 'generated' | 'reviewed' | 'presented' | 'actioned' | 'dismissed' | 'archived';
export type InsightType = 'risk_foresight' | 'compliance_alert' | 'strategic_opportunity' | 'performance_trend' | 'governance_health' | 'executive_briefing';
export type ImpactArea = 'strategic' | 'operational' | 'financial' | 'regulatory' | 'reputational';

export interface LeadershipInsightContract {
  insightId: string; tenantId: string; code: string; titleEn: string; titleAr: string | null;
  status: LeadershipInsightStatus; insightType: InsightType;
  impactArea: ImpactArea; confidence: number;
  narrative: string; recommendation: string;
  sourceModules: string[]; sourceMetricIds: string[];
  generatedAt: string; presentedAt: string | null;
  actionedById: string | null; actionedAt: string | null;
  createdAt: string; updatedAt: string;
}

export interface ForesightContract {
  foresightId: string; tenantId: string;
  horizon: '30_day' | '90_day' | '180_day' | '365_day';
  riskTrend: 'improving' | 'stable' | 'deteriorating';
  complianceTrend: 'improving' | 'stable' | 'deteriorating';
  keyRisks: string[]; keyOpportunities: string[];
  confidenceScore: number; generatedAt: string;
}

export interface ProactiveLeadershipDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalInsights: number;
  pendingReview: number; staleInsights: number;
  avgConfidence: number; generationLatencyMs: number | null;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface ProactiveLeadershipPriorityContract {
  priority: string;
  urgency: string;
  rationale: string;
  owner_role: string;
}

export interface ProactiveLeadershipCycleContract {
  day?: string;
  signals?: number;
  initiatives?: number;
  predictions?: number;
  avg_cycle_ms?: number;
}

export interface ProactiveLeadershipSignalBreakdownContract {
  signal_type?: string;
  severity?: string;
  cnt?: number | string;
  avg_confidence?: number | string;
}

export interface ProactiveLeadershipDashboardContract {
  topPriorities: ProactiveLeadershipPriorityContract[];
  riskTrajectory: string;
  complianceMomentum: { direction: string; delta: number };
  recentCycles: ProactiveLeadershipCycleContract[];
  signalBreakdown: ProactiveLeadershipSignalBreakdownContract[];
  executiveSummary: string;
  boardAttentionItems: string[];
  overdueSummary: { total: number; critical: number; avgDaysOverdue: number };
  workloadBalance: { maxLoad: number; minLoad: number; imbalanceRatio: number };
}
