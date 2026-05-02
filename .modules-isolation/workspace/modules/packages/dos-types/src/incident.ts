/**
 * @dos/types — incident, alert, and security event types
 * Covers incident response, alerts, SoC, threat management
 */

// ── Incident Types ────────────────────────────────────────────────────────

export type IncidentStatus =
  | 'new'
  | 'triage'
  | 'investigating'
  | 'containment'
  | 'eradication'
  | 'recovery'
  | 'post_incident'
  | 'closed'
  | 'false_positive'
  | 'reported'
  | 'triaged'
  | 'contained'
  | 'eradicated'
  | 'recovered'
  | 'archived';

export type IncidentSeverity = 'critical' | 'high' | 'informational' | 'low' | 'medium';
export type IncidentCategory =
  | 'data_breach'
  | 'unauthorized_access'
  | 'malware'
  | 'phishing'
  | 'dos_attack'
  | 'insider_threat'
  | 'policy_violation'
  | 'physical_security'
  | 'availability'
  | 'compliance_breach'
  | 'other';

export interface Incident {
  incidentId: string;
  tenantId: string;
  workspaceId?: string;
  title: string;
  titleAr?: string;
  description?: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  detectedAt: string;
  reportedAt: string;
  containedAt?: string;
  eradicatedAt?: string;
  recoveredAt?: string;
  closedAt?: string;
  reportedBy: string;
  assignedTo?: string;
  incidentTeam?: string[];
  affectedSystems?: string[];
  affectedUsers?: string[];
  affectedDataTypes?: string[];
  potentialImpact?: string;
  confirmedImpact?: string;
  rootCause?: string;
  attackVector?: string;
  attackTechnique?: string;
  iocIds?: string[];
  alerts?: string[];
  relatedIncidentIds?: string[];
  containmentActions?: IncidentAction[];
  remediationActions?: IncidentAction[];
  lessonLearned?: string;
  notificationRequired?: boolean;
  notificationSent?: boolean;
  regulatoryReportRequired?: boolean;
  cveIds?: string[];
  mitreTactics?: string[];
  mitreTechniques?: string[];
  priority: string;
  slaBreached?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentAction {
  actionId: string;
  type: 'containment' | 'eradication' | 'recovery' | 'notification' | 'forensic' | 'other';
  description: string;
  performedBy?: string;
  performedAt?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'failed';
  outcome?: string;
}

export interface IncidentTimeline {
  incidentId: string;
  entries: IncidentTimelineEntry[];
}

export interface IncidentTimelineEntry {
  entryId: string;
  timestamp: string;
  event: string;
  detail?: string;
  actorId?: string;
  systemGenerated: boolean;
  category: 'detection' | 'action' | 'update' | 'communication' | 'resolution';
}

export interface PostIncidentReview {
  reviewId: string;
  incidentId: string;
  tenantId: string;
  reviewedAt: string;
  reviewedBy: string;
  participants?: string[];
  timeline: string;
  rootCauseAnalysis: string;
  impactAssessment: string;
  lessonsLearned: string;
  preventiveMeasures: string[];
  followUpActions: IncidentFollowUp[];
  reportUrl?: string;
  status: 'draft' | 'final';
  createdAt: string;
}

export interface IncidentFollowUp {
  actionId: string;
  description: string;
  owner: string;
  dueDate: string;
  priority: IncidentSeverity;
  status: 'open' | 'in_progress' | 'completed';
  completedAt?: string;
}

// ── Alert Types ────────────────────────────────────────────────────────────

export type AlertStatus = 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed';
export type AlertSource =
  | 'siem'
  | 'ids_ips'
  | 'edr'
  | 'vulnerability_scanner'
  | 'compliance_engine'
  | 'cloud_guard'
  | 'waf'
  | 'dlp'
  | 'ueba'
  | 'custom';

export interface Alert {
  alertId: string;
  tenantId: string;
  workspaceId?: string;
  title: string;
  description?: string;
  source: AlertSource;
  externalId?: string;
  severity: IncidentSeverity;
  status: AlertStatus;
  category?: IncidentCategory;
  detectedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  assignedTo?: string;
  affectedAssets?: string[];
  indicators?: IOC[];
  rawData?: Record<string, unknown>;
  enrichmentData?: AlertEnrichment;
  correlatedAlertIds?: string[];
  incidentId?: string;
  ruleId?: string;
  ruleName?: string;
  falsePositive?: boolean;
  suppressUntil?: string;
  score?: number;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AlertEnrichment {
  geoLocation?: GeoLocation;
  reputationScore?: number;
  threatIntelTags?: string[];
  assetContext?: Record<string, unknown>;
  userContext?: Record<string, unknown>;
  enrichedAt: string;
}

export interface GeoLocation {
  ip?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  isProxy?: boolean;
  isTor?: boolean;
  isVpn?: boolean;
}

// ── IOC (Indicator of Compromise) Types ──────────────────────────────────

export type IOCType = 'ip' | 'domain' | 'url' | 'file_hash' | 'email' | 'user_agent' | 'registry_key' | 'mutex';

export interface IOC {
  iocId: string;
  tenantId?: string;
  type: IOCType;
  value: string;
  context?: string;
  severity?: IncidentSeverity;
  confidence?: number;
  source?: string;
  externalId?: string;
  firstSeen?: string;
  lastSeen?: string;
  expiresAt?: string;
  tags?: string[];
  isGlobal?: boolean;
  relatedIncidentIds?: string[];
  mitreTechniques?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ThreatIntelFeed {
  feedId: string;
  name: string;
  provider: string;
  feedUrl?: string;
  types: IOCType[];
  lastSyncedAt?: string;
  totalIOCs?: number;
  isActive: boolean;
  syncIntervalMinutes?: number;
}

// ── Vulnerability Types ────────────────────────────────────────────────────

export type VulnerabilityStatus = 'open' | 'accepted' | 'mitigated' | 'resolved' | 'false_positive' | 'deferred';
export type VulnerabilitySeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export interface Vulnerability {
  vulnId: string;
  tenantId: string;
  cveId?: string;
  title: string;
  description?: string;
  severity: VulnerabilitySeverity;
  cvssScore?: number;
  cvssVector?: string;
  status: VulnerabilityStatus;
  affectedAssets?: string[];
  affectedSoftware?: string;
  patch?: string;
  patchAvailableAt?: string;
  detectedBy?: string;
  detectedAt: string;
  dueDate?: string;
  remediatedAt?: string;
  assignedTo?: string;
  remediationNote?: string;
  riskAcceptanceNote?: string;
  exploitabilityScore?: number;
  isExploited?: boolean;
  isPatchable?: boolean;
  mitreTechniques?: string[];
  relatedVulnIds?: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Security Metrics Types ────────────────────────────────────────────────

export interface SecurityDashboard {
  tenantId: string;
  period: string;
  openIncidents: number;
  openAlerts: number;
  criticalAlerts: number;
  openVulnerabilities: number;
  criticalVulnerabilities: number;
  avgMttr?: number;
  avgMtta?: number;
  incidentTrend: TrendPoint[];
  alertTrend: TrendPoint[];
  topIncidentCategories: CategoryCount[];
  topAlertSources: CategoryCount[];
  lastUpdatedAt: string;
}

export interface TrendPoint {
  date: string;
  value: number;
  change?: number;
}

export interface CategoryCount {
  category: string;
  count: number;
  percent?: number;
}


// ── Module CRUD Types (migrated from backend module) ────────────────────────

export interface IncidentRow {
  incident_id: string;
  tenant_id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  incident_type: string;
  reported_by: string;
  assigned_to?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  deleted_at?: string | null;
}

export interface IncidentCreateInput {
  tenant_id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  incident_type: string;
  reported_by: string;
  assigned_to?: string;
  resolved_at?: string;
  created_by: string;
}

export interface IncidentUpdateInput {
  
  title: string;
  description: string;
  severity: string;
  status: string;
  incident_type: string;
  reported_by: string;
  assigned_to?: string;
  resolved_at?: string;
  updated_by: string;
}

export interface IncidentListFilter {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface IncidentListResult {
  rows: Incident[];
  total: number;
}

export const INCIDENT_STATUSES: readonly IncidentStatus[] = ['reported', 'triaged', 'investigating', 'contained', 'eradicated', 'recovered', 'closed', 'archived'] as const;

export const INCIDENT_SEVERITIES: readonly IncidentSeverity[] = ['critical', 'high', 'medium', 'low'] as const;

export type IncidentSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';

export const INCIDENT_SOURCES: readonly IncidentSource[] = ['manual', 'import', 'api', 'workflow', 'ai_agent', 'system'] as const;

export type IncidentStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';

export interface IncidentEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'incident';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  previousState?: IncidentStatus;
  newState?: IncidentStatus;
  data: Record<string, unknown>;
}
