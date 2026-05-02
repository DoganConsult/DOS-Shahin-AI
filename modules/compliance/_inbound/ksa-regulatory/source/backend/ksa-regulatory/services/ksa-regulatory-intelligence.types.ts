import type { RegulatoryDeadline } from './ksa-regulatory-intelligence.service';
import { safeQuery } from "@dos/db";

export interface RegulatoryIntelligenceResult {
  summary: AiExecutiveSummary;
  riskHotspots: RiskHotspot[];
  upcomingDeadlines: DeadlineWithReadiness[];
  insights: RegulatoryInsight[];
  generatedAt: string;
}

export interface AiExecutiveSummary {
  overallPosture: 'strong' | 'adequate' | 'needs_attention' | 'critical';
  summaryEn: string;
  summaryAr: string;
  keyMetrics: {
    overallComplianceScore: number;
    activeFrameworksCount: number;
    pendingChangesCount: number;
    overdueObligationsCount: number;
    upcomingDeadlinesCount: number;
  };
}

export interface RiskHotspot {
  frameworkCode: string;
  domainName: string;
  score: number; // 0-100
  controlsAtRisk: number;
  totalControls: number;
  regulatorCode: string;
  reasonEn: string;
  reasonAr: string;
}

export interface DeadlineWithReadiness {
  deadline: RegulatoryDeadline;
  daysUntilDue: number;
  readinessScore: number; // 0-100
  readinessStatus: 'ready' | 'on_track' | 'at_risk' | 'overdue';
  gapsToClose: number;
}

export interface RegulatoryInsight {
  insightType: 'trend' | 'recommendation' | 'benchmark' | 'alert';
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  severity: 'info' | 'warning' | 'critical';
  relatedFramework: string | null;
}

export interface UpdateCheckResult {
  hasUpdates: boolean;
  updates: FrameworkUpdate[];
  lastCheckedAt: string;
}

export interface FrameworkUpdate {
  frameworkCode: string;
  frameworkName: string;
  updateType: 'version_change' | 'new_controls' | 'deprecated_controls' | 'guidance_update';
  descriptionEn: string;
  descriptionAr: string;
  publishedAt: string;
  affectsControlCount: number;
}

export interface CalendarEvent {
  eventId: string;
  eventType: 'submission_deadline' | 'audit_period' | 'renewal_date' | 'reporting_deadline' | 'regulatory_change';
  title: string;
  titleAr: string;
  date: string;
  endDate: string | null;
  frameworkCode: string;
  regulatorCode: string;
  readinessScore: number;
  status: 'upcoming' | 'overdue' | 'completed';
}

export interface RegulatoryCalendarResult {
  events: CalendarEvent[];
  overdueCount: number;
  upcomingCount: number;
}

export interface RegulatoryBriefResult {
  brief: BriefContent;
  keyMetrics: BriefMetrics;
  priorities: BriefPriority[];
  generatedAt: string;
}

export interface BriefContent {
  textEn: string;
  textAr: string;
  executiveSummaryEn: string;
  executiveSummaryAr: string;
}

export interface BriefMetrics {
  overallScore: number;
  frameworkCount: number;
  controlsTotal: number;
  controlsImplemented: number;
  gapCount: number;
  overdueObligations: number;
}

export interface BriefPriority {
  timeframe: '30_days' | '60_days' | '90_days';
  priorityEn: string;
  priorityAr: string;
  relatedFramework: string | null;
  urgency: 'critical' | 'high' | 'medium';
}

export interface ComplianceDataSummary {
  overallScore: number;
  frameworkCount: number;
  totalControls: number;
  implementedControls: number;
}
