/**
 * GRC Risk sub-service DTOs — AGRC-OS
 * Covers: Risk Management, Risk Scoring, Risk Metrics, KRI,
 * BCP / DR, Incidents, and Vendor Risk.
 */
import { BaseEntityDto, MessageResponse } from '@app/core/models/shared.types';

// ── Risk Management ──

export interface RiskListDto {
  risks: RiskItemDto[];
  total?: number;
}

export interface RiskItemDto extends BaseEntityDto {
  title?: string;
  description?: string;
  category?: string;
  likelihood?: number;
  impact?: number;
  score?: number;
  status?: string;
  owner?: string;
  treatment?: string;
  residualScore?: number;
  controlIds?: string[];
}

export interface RiskMatrixDto {
  cells: Array<{ likelihood: number; impact: number; count: number; risks: Array<{ id: string; title: string; score: number }> }>;
  dimensions?: { likelihoodLevels: number; impactLevels: number };
}

export interface RiskDetailDto extends RiskItemDto {
  history?: Array<{ date: string; field: string; oldValue: string; newValue: string }>;
  controls?: Array<{ id: string; title: string; effectiveness?: number }>;
  indicators?: Array<{ name: string; value: number; threshold?: number }>;
}

export interface CreateRiskRequest {
  title: string;
  description?: string;
  category?: string;
  likelihood?: number;
  impact?: number;
  status?: string;
  owner?: string;
  treatment?: string;
  controlIds?: string[];
  [key: string]: unknown;
}

export interface UpdateRiskRequest {
  title?: string;
  description?: string;
  category?: string;
  likelihood?: number;
  impact?: number;
  status?: string;
  owner?: string;
  treatment?: string;
  controlIds?: string[];
  [key: string]: unknown;
}

export interface KRITrendsDto {
  indicators: Array<{ name: string; values: Array<{ date: string; value: number }> }>;
}

// ── Risk Scoring ──

export interface RiskPostureDto {
  overallScore: number;
  trend: string;
  categories: Array<{ name: string; score: number }>;
}

export interface RiskScoringModelDto {
  id: string;
  name: string;
  type: string;
  parameters: RiskScoringModelParamsDto;
}

export interface RiskScoringModelParamsDto {
  weights?: Record<string, number>;
  thresholds?: Record<string, number>;
  algorithm?: string;
}

export interface UpdateRiskScoringModelRequest {
  name?: string;
  type?: string;
  weights?: Record<string, number>;
  thresholds?: Record<string, number>;
  algorithm?: string;
  [key: string]: unknown;
}

// ── Risk Metrics ──

export interface RiskMetricsKPIDto {
  kpis: Array<{ key: string; value: number; threshold: number }>;
}

export interface RiskTrendsDto {
  trends: Array<{ date: string; score: number; category: string }>;
}

// ── AI Risk Assessment ──

export interface AIRiskAssessmentDto {
  riskId: string;
  assessment: string;
  recommendations?: string[];
  confidence?: number;
  factors?: Array<{ name: string; weight: number; value: number }>;
}

// ── Incidents ──

export interface IncidentListDto {
  incidents: IncidentItemDto[];
  total?: number;
}

export interface IncidentItemDto extends BaseEntityDto {
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  reportedBy?: string;
  reportedAt?: string;
  resolvedAt?: string;
  category?: string;
}

export interface CreateIncidentRequest {
  title: string;
  description?: string;
  severity?: string;
  category?: string;
  [key: string]: unknown;
}

export interface InvestigateIncidentRequest {
  findings?: string;
  rootCause?: string;
  status?: string;
  [key: string]: unknown;
}

export interface AIIncidentTriageDto {
  incidentId: string;
  severity: string;
  suggestedCategory?: string;
  suggestedAssignee?: string;
  confidence?: number;
  recommendations?: string[];
}

// ── BCP ──

export interface BCPPlanListDto {
  plans: BCPPlanDto[];
  total?: number;
}

export interface BCPPlanDto extends BaseEntityDto {
  title?: string;
  status?: string;
  description?: string;
  lastTestedAt?: string;
  rto?: number;
  rpo?: number;
}

export interface CreateBCPPlanRequest {
  title: string;
  description?: string;
  rto?: number;
  rpo?: number;
  [key: string]: unknown;
}

export interface ScheduleDRTestRequest {
  scheduledDate: string;
  type?: string;
  scope?: string;
  [key: string]: unknown;
}

export interface DocumentRecoveryRequest {
  outcome: string;
  notes?: string;
  actualRto?: number;
  actualRpo?: number;
  [key: string]: unknown;
}

export interface BCPAnalyticsDto {
  indicators?: Array<{ name: string; value: number; trend: string }>;
  readiness?: { score: number; gaps: string[] };
  predictions?: Array<{ metric: string; value: number; confidence: number }>;
}

// ── Vendors ──

export interface VendorListDto {
  vendors: VendorItemDto[];
  total?: number;
}

export interface VendorItemDto extends BaseEntityDto {
  name?: string;
  status?: string;
  riskLevel?: string;
  category?: string;
  contactEmail?: string;
}

export interface CreateVendorRequest {
  name: string;
  category?: string;
  contactEmail?: string;
  [key: string]: unknown;
}

export interface VendorSLADto {
  vendorId: string;
  slaItems: Array<{ metric: string; target: number; actual: number; status: string }>;
}

// ── Vendor Risk Extended ──

export interface VendorRiskProfileDto extends BaseEntityDto {
  vendorId: string;
  riskScore?: number;
  assessmentDate?: string;
  status?: string;
  findings?: Array<{ category: string; severity: string; description: string }>;
}

export interface CreateVendorRiskAssessmentRequest {
  assessmentType?: string;
  scope?: string;
  [key: string]: unknown;
}

export interface VendorQuestionnaireDto extends BaseEntityDto {
  vendorId?: string;
  title?: string;
  status?: string;
  dueDate?: string;
  responseRate?: number;
}

export interface SendVendorQuestionnaireRequest {
  vendorId: string;
  templateId?: string;
  dueDate?: string;
  [key: string]: unknown;
}

export { MessageResponse };
