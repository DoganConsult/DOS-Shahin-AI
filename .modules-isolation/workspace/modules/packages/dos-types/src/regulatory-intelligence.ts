/**
 * @dos/types — regulatory intelligence and legal entity types
 * Covers regulatory bodies, legal entities, sanctions, licensing, regulatory monitoring
 */

// ── Regulatory Body Types ──────────────────────────────────────────────

export type RegulatoryBodyType =
  | 'financial_regulator'
  | 'data_protection'
  | 'telecommunications'
  | 'cybersecurity'
  | 'environmental'
  | 'health_safety'
  | 'competition'
  | 'securities'
  | 'insurance'
  | 'banking'
  | 'customs'
  | 'other';

export interface RegulatoryBody {
  bodyId: string;
  tenantId?: string;
  name: string;
  nameAr?: string;
  abbreviation?: string;
  type?: RegulatoryBodyType;
  countryCode?: string;
  region?: string;
  jurisdiction?: string;
  websiteUrl?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  description?: string;
  isActive?: boolean;
  monitoringEnabled?: boolean;
  frameworks?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Legal Entity Types ─────────────────────────────────────────────────

export type LegalEntityType =
  | 'corporation'
  | 'llc'
  | 'partnership'
  | 'sole_proprietorship'
  | 'branch'
  | 'subsidiary'
  | 'joint_venture'
  | 'trust'
  | 'ngo'
  | 'government'
  | 'other';

export type LegalEntityStatus = 'active' | 'inactive' | 'dissolved' | 'bankrupt' | 'suspended' | 'restructuring';

export interface LegalEntity {
  entityId: string;
  tenantId: string;
  name: string;
  nameAr?: string;
  type?: LegalEntityType;
  status?: LegalEntityStatus;
  registrationNumber?: string;
  taxId?: string;
  vatNumber?: string;
  incorporationDate?: string;
  dissolutionDate?: string;
  incorporationCountry?: string;
  operatingCountries?: string[];
  registeredAddress?: EntityAddress;
  principalAddress?: EntityAddress;
  parentEntityId?: string;
  subsidiaries?: string[];
  shareholdingStructure?: ShareholdingEntry[];
  legalRepresentative?: string;
  boardMembers?: BoardMember[];
  regulatoryBodyIds?: string[];
  licenseIds?: string[];
  industries?: string[];
  sic?: string;
  naics?: string;
  employeeCount?: number;
  annualRevenueUSD?: number;
  listedExchanges?: string[];
  isin?: string;
  lei?: string;
  isUltimateBeneficialOwner?: boolean;
  uboList?: UBOEntry[];
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EntityAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryCode?: string;
}

export interface ShareholdingEntry {
  shareholderId?: string;
  shareholderName?: string;
  type?: 'individual' | 'entity';
  ownershipPct?: number;
  votingRightsPct?: number;
  shareClass?: string;
}

export interface BoardMember {
  memberId?: string;
  name?: string;
  role?: 'chairman' | 'ceo' | 'cfo' | 'director' | 'independent_director' | 'secretary' | 'other';
  nationality?: string;
  appointedAt?: string;
  tenureEnd?: string;
  isExecutive?: boolean;
}

export interface UBOEntry {
  uboId?: string;
  name?: string;
  nationality?: string;
  ownershipPct?: number;
  controlMethod?: 'shares' | 'voting_rights' | 'other_means';
  politicallyExposed?: boolean;
  verified?: boolean;
  verifiedAt?: string;
}

// ── License & Permit Types ─────────────────────────────────────────────

export type LicenseStatus = 'active' | 'pending' | 'expired' | 'revoked' | 'suspended' | 'under_renewal';

export interface RegulatoryLicense {
  licenseId: string;
  tenantId: string;
  entityId?: string;
  name: string;
  licenseNumber?: string;
  type?: string;
  category?: string;
  issuedBy?: string;
  issuingBodyId?: string;
  issuedAt?: string;
  expiresAt?: string;
  status?: LicenseStatus;
  countryCode?: string;
  jurisdiction?: string;
  scope?: string;
  conditions?: string;
  fees?: number;
  currency?: string;
  renewalLeadDays?: number;
  autoRenewal?: boolean;
  nextRenewalDate?: string;
  documentId?: string;
  ownerId?: string;
  notes?: string;
  revocationReason?: string;
  revokedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Sanctions Screening Types ─────────────────────────────────────────

export type SanctionsList =
  | 'ofac_sdn'
  | 'eu_sanctions'
  | 'un_sanctions'
  | 'uk_sanctions'
  | 'fatf_black'
  | 'fatf_grey'
  | 'interpol'
  | 'world_bank_debarment'
  | 'pep'
  | 'adverse_media';

export type SanctionsScreeningStatus = 'pending' | 'clear' | 'potential_match' | 'confirmed_match' | 'false_positive';

export interface SanctionsScreening {
  screeningId: string;
  tenantId: string;
  subjectType?: 'vendor' | 'partner' | 'employee' | 'customer' | 'entity' | 'individual';
  subjectId?: string;
  subjectName?: string;
  status?: SanctionsScreeningStatus;
  listsChecked?: SanctionsList[];
  provider?: string;
  screenedAt: string;
  nextScreeningAt?: string;
  frequencyDays?: number;
  hits?: SanctionsHit[];
  hitCount?: number;
  clearedBy?: string;
  clearedAt?: string;
  clearanceNote?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SanctionsHit {
  hitId?: string;
  list?: SanctionsList;
  matchedName?: string;
  matchScore?: number;
  aliases?: string[];
  dateOfBirth?: string;
  nationality?: string;
  designation?: string;
  listingDate?: string;
  details?: string;
  isConfirmed?: boolean;
  isFalsePositive?: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

// ── Regulatory Monitoring & Intelligence Types ─────────────────────────

export type MonitoringAlertType =
  | 'new_regulation'
  | 'amendment'
  | 'enforcement_action'
  | 'guidance_issued'
  | 'consultation'
  | 'deadline_reminder'
  | 'industry_news';

export interface RegulatoryAlert {
  alertId: string;
  tenantId: string;
  type?: MonitoringAlertType;
  title: string;
  summary?: string;
  jurisdiction?: string;
  regulatoryBodyId?: string;
  regulatoryBodyName?: string;
  frameworks?: string[];
  industries?: string[];
  sourceUrl?: string;
  publicationDate?: string;
  effectiveDate?: string;
  complianceDeadline?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  impactAssessment?: string;
  actionRequired?: boolean;
  actionDescription?: string;
  assignedTo?: string;
  status?: 'new' | 'reviewing' | 'actioned' | 'dismissed';
  dismissedBy?: string;
  dismissedAt?: string;
  relatedObligationIds?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Enforcement Action Types ──────────────────────────────────────────

export type EnforcementSeverity = 'criminal' | 'civil' | 'administrative' | 'warning' | 'informal';

export interface EnforcementAction {
  actionId: string;
  tenantId?: string;
  entityId?: string;
  entityName?: string;
  regulatoryBodyId?: string;
  bodyName?: string;
  type?: EnforcementSeverity;
  description?: string;
  allegation?: string;
  penalty?: number;
  currency?: string;
  orderDate?: string;
  deadline?: string;
  status?: 'active' | 'appealed' | 'closed' | 'paid';
  remediationRequired?: boolean;
  remediationDeadline?: string;
  remediationNotes?: string;
  appeal?: EnforcementAppeal;
  sourceUrl?: string;
  publiclyDisclosed?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EnforcementAppeal {
  appealId?: string;
  filedAt?: string;
  outcome?: 'pending' | 'upheld' | 'partially_upheld' | 'dismissed';
  revisedPenalty?: number;
  notes?: string;
}

// ── KYB (Know Your Business) Types ────────────────────────────────────

export type KYBStatus = 'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'expired';

export interface KYBRecord {
  kybId: string;
  tenantId: string;
  entityId?: string;
  entityName?: string;
  status?: KYBStatus;
  riskLevel?: 'high' | 'medium' | 'low';
  checklist?: KYBCheckItem[];
  initiatedBy?: string;
  initiatedAt?: string;
  completedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  expiresAt?: string;
  renewalRequired?: boolean;
  provider?: string;
  providerRef?: string;
  sanctionsResult?: SanctionsScreeningStatus;
  pepExposure?: boolean;
  adverseMediaFound?: boolean;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface KYBCheckItem {
  checkId?: string;
  checkType?: string;
  required?: boolean;
  status?: 'pending' | 'passed' | 'failed' | 'waived';
  documents?: string[];
  notes?: string;
  completedAt?: string;
}

// ── Regulatory Intelligence Dashboard ────────────────────────────────

export interface RegulatoryIntelligenceDashboard {
  tenantId: string;
  asOf: string;
  totalRegulatoryBodies?: number;
  monitoredJurisdictions?: number;
  activeAlerts?: number;
  criticalAlerts?: number;
  upcomingDeadlines?: number;
  activeLicenses?: number;
  expiringLicenses?: number;
  openEnforcementActions?: number;
  kybRecordsDue?: number;
  sanctionsScreeningsDue?: number;
  recentAlerts?: Array<{ alertId: string; title: string; type?: MonitoringAlertType; severity?: string; publicationDate?: string }>;
  upcomingDeadlinesList?: Array<{ alertId: string; title: string; deadline?: string; description?: string }>;
}
