/**
 * @dos/types — supply chain and procurement risk types
 * Covers procurement lifecycle, SCRM, product safety, sanctions
 */

// ── Supplier Types ────────────────────────────────────────────────────────

export type SupplierStatus = 'approved' | 'conditional' | 'blocked' | 'inactive' | 'pending_review' | 'offboarded';
export type SupplierCategory =
  | 'raw_materials'
  | 'components'
  | 'finished_goods'
  | 'services'
  | 'it_services'
  | 'logistics'
  | 'professional'
  | 'commodities'
  | 'other';

export type SupplierRiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface Supplier {
  supplierId: string;
  tenantId: string;
  workspaceId?: string;
  name: string;
  nameAr?: string;
  code?: string;
  category: SupplierCategory;
  status: SupplierStatus;
  riskLevel: SupplierRiskLevel;
  countryCode?: string;
  website?: string;
  contacts?: SupplierContact[];
  certifications?: SupplierCertification[];
  financialHealth?: FinancialHealth;
  riskProfile?: SupplierRiskProfile;
  performance?: SupplierPerformance;
  contracts?: string[];
  alternativeSupplierIds?: string[];
  singleSource?: boolean;
  concentrationRisk?: boolean;
  geopoliticalRisk?: string;
  sanctionsChecked?: boolean;
  sanctionsCheckedAt?: string;
  sustainabilityScore?: number;
  labourPracticesScore?: number;
  environmentScore?: number;
  ownerId?: string;
  tags?: string[];
  onboardedAt?: string;
  nextReviewDate?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierContact {
  contactId?: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  isPrimary?: boolean;
}

export interface SupplierCertification {
  name: string;
  certificationBody?: string;
  validFrom?: string;
  validTo?: string;
  fileId?: string;
  status?: 'valid' | 'expired' | 'pending';
}

export interface FinancialHealth {
  creditRating?: string;
  ratingAgency?: string;
  annualRevenue?: number;
  currency?: string;
  profitMarginPercent?: number;
  debtEquityRatio?: number;
  currentRatio?: number;
  assessedAt?: string;
  financialRisk?: 'high' | 'medium' | 'low';
}

export interface SupplierRiskProfile {
  overallRisk: SupplierRiskLevel;
  geopoliticalRisk?: 'high' | 'medium' | 'low';
  cyberRisk?: 'high' | 'medium' | 'low';
  financialRisk?: 'high' | 'medium' | 'low';
  operationalRisk?: 'high' | 'medium' | 'low';
  reputationalRisk?: 'high' | 'medium' | 'low';
  complianceRisk?: 'high' | 'medium' | 'low';
  concentrationRisk?: 'high' | 'medium' | 'low';
  lastAssessedAt?: string;
  assessedBy?: string;
  nextAssessmentDate?: string;
}

export interface SupplierPerformance {
  overallScore?: number;
  qualityScore?: number;
  deliveryScore?: number;
  responsiveness?: number;
  innovation?: number;
  compliance?: number;
  lastReviewedAt?: string;
  reviewPeriod?: string;
  openIssues?: number;
  resolvedIssues?: number;
  slaBreaches?: number;
}

// ── Procurement Types ──────────────────────────────────────────────────────

export type ProcurementStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'awarded' | 'active' | 'completed' | 'cancelled';
export type ProcurementType = 'rfq' | 'rfp' | 'rfi' | 'tender' | 'direct_award' | 'framework';

export interface ProcurementRequest {
  requestId: string;
  tenantId: string;
  type: ProcurementType;
  title: string;
  description?: string;
  status: ProcurementStatus;
  estimatedValue: number;
  currency: string;
  requiredBy?: string;
  requestedBy: string;
  departmentId?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  vendors?: string[];
  winningSupplierId?: string;
  contractId?: string;
  riskAssessmentRequired?: boolean;
  riskAssessmentDone?: boolean;
  complianceChecks?: ProcurementComplianceCheck[];
  documents?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementComplianceCheck {
  checkId: string;
  type: 'sanctions' | 'aml' | 'data_privacy' | 'conflict_of_interest' | 'anti_bribery' | 'environmental' | 'custom';
  status: 'pending' | 'passed' | 'failed' | 'not_applicable';
  checkedBy?: string;
  checkedAt?: string;
  notes?: string;
}

// ── Supply Chain Disruption Types ──────────────────────────────────────────

export type DisruptionStatus = 'monitoring' | 'active' | 'mitigated' | 'resolved';
export type DisruptionType =
  | 'geopolitical'
  | 'natural_disaster'
  | 'cyber_attack'
  | 'financial'
  | 'logistics'
  | 'regulatory'
  | 'pandemic'
  | 'labor'
  | 'quality'
  | 'other';

export interface SupplyChainDisruption {
  disruptionId: string;
  tenantId: string;
  type: DisruptionType;
  title: string;
  description?: string;
  status: DisruptionStatus;
  severity: 'critical' | 'high' | 'medium' | 'low';
  detectedAt: string;
  resolvedAt?: string;
  affectedSupplierIds?: string[];
  affectedProductCategories?: string[];
  affectedGeographies?: string[];
  estimatedImpact?: string;
  financialImpact?: number;
  currency?: string;
  rootCause?: string;
  mitigationActions?: DisruptionMitigation[];
  alternativeSourcesIdentified?: boolean;
  inventoryBuffer?: number;
  leadTimeImpactDays?: number;
  assignedTo?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DisruptionMitigation {
  actionId: string;
  action: string;
  owner?: string;
  dueDate?: string;
  status: 'open' | 'in_progress' | 'completed';
  completedAt?: string;
  effectiveness?: 'high' | 'medium' | 'low';
}

// ── Sanctions Types ────────────────────────────────────────────────────────

export type SanctionsScreeningStatus = 'pending' | 'clear' | 'match_found' | 'false_positive' | 'escalated';

export interface SanctionsScreeningRecord {
  screeningId: string;
  tenantId: string;
  entityType: 'supplier' | 'vendor' | 'customer' | 'employee' | 'other';
  entityId?: string;
  entityName: string;
  countryCode?: string;
  status: SanctionsScreeningStatus;
  screenedAt: string;
  screenedBy?: string;
  listsSreened?: string[];
  matchScore?: number;
  matchDetails?: SanctionsMatch[];
  disposition?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  nextScreeningDate?: string;
}

export interface SanctionsMatch {
  matchId: string;
  list: string;
  name: string;
  entityType?: string;
  matchType: 'exact' | 'close' | 'fuzzy';
  score?: number;
  program?: string;
  jurisdiction?: string;
}

// ── Bill of Materials Risk ─────────────────────────────────────────────────

export interface BOMRiskAssessment {
  assessmentId: string;
  tenantId: string;
  productId?: string;
  productName?: string;
  bomComponents?: BOMComponent[];
  overallRisk: SupplierRiskLevel;
  singleSourceCount?: number;
  criticalComponentCount?: number;
  sancctionedSupplierCount?: number;
  geopoliticalExposure?: string[];
  assessedAt?: string;
  assessedBy?: string;
  nextAssessmentDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BOMComponent {
  componentId: string;
  name: string;
  type?: string;
  supplierId?: string;
  supplierName?: string;
  countryOfOrigin?: string;
  isCritical?: boolean;
  isSingleSource?: boolean;
  substitutes?: string[];
  riskLevel?: SupplierRiskLevel;
  leadTimeDays?: number;
}

// ── SCRM Dashboard ─────────────────────────────────────────────────────────

export interface SCRMDashboard {
  tenantId: string;
  totalSuppliers: number;
  criticalSuppliers: number;
  blockedSuppliers: number;
  activeDisruptions: number;
  openProcurements: number;
  pendingSanctionsChecks: number;
  overduePerformanceReviews: number;
  singleSourceSuppliers: number;
  byRisk: Record<SupplierRiskLevel, number>;
  topRisks?: string[];
  lastUpdatedAt: string;
}
