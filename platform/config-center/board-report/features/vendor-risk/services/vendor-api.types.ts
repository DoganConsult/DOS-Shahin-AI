/**
 * Vendor API Service DTOs
 * Type definitions for all vendor-related API endpoints.
 */

// ── Due Diligence ─────────────────────────────────────────────────────

export interface DueDiligenceInitRequest {
  vendorId: string;
  vendorName?: string;
  scope?: string;
  [key: string]: unknown;
}

export interface DueDiligenceDto {
  id?: string;
  vendorId?: string;
  status?: string;
  startedAt?: string;
  completedAt?: string;
  steps?: DueDiligenceStepDto[];
  [key: string]: unknown;
}

export interface DueDiligenceStepDto {
  id?: string;
  stepName?: string;
  status?: string;
  assignedTo?: string;
  completedAt?: string;
  [key: string]: unknown;
}

export interface DueDiligenceStepUpdateRequest {
  status?: string;
  notes?: string;
  completedAt?: string;
  [key: string]: unknown;
}

// ── Fourth-Party / Sub-Vendors ────────────────────────────────────────

export interface SubVendorDto {
  id?: string;
  vendorId?: string;
  subVendorName?: string;
  services?: string[];
  riskLevel?: string;
  [key: string]: unknown;
}

export interface SubVendorExposureDto {
  vendorId?: string;
  totalSubVendors?: number;
  highRiskCount?: number;
  exposureScore?: number;
  [key: string]: unknown;
}

// ── SLA ───────────────────────────────────────────────────────────────

export interface SLABreachDto {
  id?: string;
  vendorId?: string;
  metricName?: string;
  breachedAt?: string;
  severity?: string;
  [key: string]: unknown;
}

export interface SLAMetricRecordRequest {
  vendorId: string;
  metricName: string;
  value: number;
  recordedAt?: string;
  [key: string]: unknown;
}

export interface SLAMetricRecordResultDto {
  success?: boolean;
  recordId?: string;
  [key: string]: unknown;
}

// ── Concentration Risk ────────────────────────────────────────────────

export interface ConcentrationRiskDto {
  dimension?: string;
  groups?: Array<{ key: string; vendorCount: number; riskScore: number }>;
  overallScore?: number;
  [key: string]: unknown;
}

export interface ConcentrationAssessResultDto {
  assessed?: boolean;
  riskScore?: number;
  findings?: string[];
  [key: string]: unknown;
}

export interface LinkSharedSubVendorsResultDto {
  linked?: number;
  [key: string]: unknown;
}

// ── Offboarding ───────────────────────────────────────────────────────

export interface OffboardingInitRequest {
  vendorId: string;
  reason?: string;
  [key: string]: unknown;
}

export interface OffboardingResultDto {
  success?: boolean;
  offboardingId?: string;
  [key: string]: unknown;
}

export interface OffboardingChecklistDto {
  vendorId?: string;
  steps?: Array<{ id: string; stepName: string; status: string; completedAt?: string }>;
  [key: string]: unknown;
}

export interface OffboardingStepUpdateRequest {
  status?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface OffboardingStepUpdateResultDto {
  success?: boolean;
  stepId?: string;
  [key: string]: unknown;
}

// ── Monitoring ────────────────────────────────────────────────────────

export interface VendorMonitoringSignalDto {
  id?: string;
  vendorId?: string;
  signalType?: string;
  value?: number;
  detectedAt?: string;
  [key: string]: unknown;
}

export interface VendorMonitoringRecordRequest {
  vendorId: string;
  signalType: string;
  value: number;
  [key: string]: unknown;
}

export interface VendorMonitoringRecordResultDto {
  success?: boolean;
  signalId?: string;
  [key: string]: unknown;
}

// ── Auto-Tier ─────────────────────────────────────────────────────────

export interface AutoTierResultDto {
  tiered?: number;
  results?: Array<{ vendorId: string; tier: string }>;
  [key: string]: unknown;
}

// ── Vendor Detail ─────────────────────────────────────────────────────

export interface VendorDetailDto {
  id: string;
  name?: string;
  status?: string;
  riskLevel?: string;
  tier?: string;
  contacts?: Array<{ name: string; email: string; role: string }>;
  [key: string]: unknown;
}

export interface VendorAssessmentEntryDto {
  id: string;
  vendorId: string;
  score?: number;
  assessedAt?: string;
  assessedBy?: string;
  [key: string]: unknown;
}

export interface VendorDocumentDto {
  id: string;
  vendorId?: string;
  title?: string;
  type?: string;
  uploadedAt?: string;
  [key: string]: unknown;
}

export interface VendorFindingDto {
  id: string;
  vendorId?: string;
  title?: string;
  severity?: string;
  status?: string;
  [key: string]: unknown;
}

export interface VendorTimelineEntryDto {
  id: string;
  action?: string;
  timestamp?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface VendorSharedResponsibilityDto {
  controlId?: string;
  controlTitle?: string;
  vendorResponsibility?: string;
  tenantResponsibility?: string;
  [key: string]: unknown;
}

// ── Scorecard ─────────────────────────────────────────────────────────

export interface VendorScorecardDto {
  vendorId?: string;
  overallScore?: number;
  dimensions?: Array<{ name: string; score: number; weight: number }>;
  [key: string]: unknown;
}

export interface VendorScorecardRunResultDto {
  success?: boolean;
  score?: number;
  [key: string]: unknown;
}

// ── Privacy ───────────────────────────────────────────────────────────

export interface VendorPrivacyStatusDto {
  vendorId?: string;
  pdplCompliant?: boolean;
  dataProcessingAgreement?: boolean;
  lastReviewedAt?: string;
  [key: string]: unknown;
}

// ── Risk Rollup ───────────────────────────────────────────────────────

export interface VendorRiskRollupDto {
  totalVendors?: number;
  highRiskCount?: number;
  averageRiskScore?: number;
  byTier?: Record<string, number>;
  [key: string]: unknown;
}

// ── Benchmarking ──────────────────────────────────────────────────────

export interface VendorBenchmarksDto {
  industryAvg?: number;
  tenantScore?: number;
  percentile?: number;
  [key: string]: unknown;
}

// ── Propagation ───────────────────────────────────────────────────────

export interface PropagationResultDto {
  propagated?: boolean;
  affectedEntities?: number;
  [key: string]: unknown;
}

// ── Create Vendor ─────────────────────────────────────────────────────

export interface CreateVendorRequest {
  name: string;
  status?: string;
  riskLevel?: string;
  contacts?: Array<{ name: string; email: string; role: string }>;
  [key: string]: unknown;
}

// ── Vendor Risk Assessment Request ────────────────────────────────────

export interface CreateVendorRiskAssessmentRequest {
  score?: number;
  notes?: string;
  criteria?: Record<string, unknown>;
  [key: string]: unknown;
}

// ── Send Questionnaire Request ────────────────────────────────────────

export interface SendVendorQuestionnaireRequest {
  title?: string;
  vendorId: string;
  templateId?: string;
  [key: string]: unknown;
}
