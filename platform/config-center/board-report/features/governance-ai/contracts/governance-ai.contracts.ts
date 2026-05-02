export type GovAiSignalStatus = 'detected' | 'analyzing' | 'interpreted' | 'escalated' | 'dismissed' | 'archived';
export type SignalCategory = 'regulatory_change' | 'risk_shift' | 'compliance_gap' | 'control_weakness' | 'trend_anomaly' | 'strategic';

export interface GovAiSignalContract {
  signalId: string; tenantId: string; category: SignalCategory; status: GovAiSignalStatus;
  titleEn: string; titleAr: string | null; summary: string;
  confidence: number; sourceModules: string[]; detectedAt: string;
  escalatedToId: string | null; dismissedById: string | null;
  linkedInsightIds: string[]; createdAt: string; updatedAt: string;
}

export interface GovAiInsightContract {
  insightId: string; signalId: string; narrative: string;
  recommendation: string; impactLevel: 'high' | 'medium' | 'low';
  generatedAt: string; modelVersion: string;
}

export interface GovAiDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalSignals: number; pendingAnalysis: number;
  escalatedCount: number; avgConfidence: number;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface GovAiDashboardContract {
  totalSignals: number; byCategory: Record<string, number>; byStatus: Record<string, number>;
  avgConfidence: number; escalatedCount: number; insightsGenerated: number;
  recentSignals: Array<{ signalId: string; category: SignalCategory; confidence: number; detectedAt: string }>;
}
