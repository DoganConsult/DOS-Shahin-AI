/**
 * @dos/types — data governance and data quality types
 * Covers data catalog, lineage, quality rules, metadata management, masking
 */

// ── Data Catalog Types ─────────────────────────────────────────────────

export type DataAssetType =
  | 'table'
  | 'view'
  | 'schema'
  | 'database'
  | 'file'
  | 'api_endpoint'
  | 'topic'
  | 'dataset'
  | 'report'
  | 'object_store'
  | 'model';

export type DataAssetStatus = 'active' | 'deprecated' | 'draft' | 'archived' | 'under_review';

export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';

export interface DataAsset {
  assetId: string;
  tenantId: string;
  name: string;
  qualifiedName?: string;
  type: DataAssetType;
  status?: DataAssetStatus;
  description?: string;
  sourceSystemId?: string;
  sourceSystemName?: string;
  databaseName?: string;
  schemaName?: string;
  tableName?: string;
  rowCount?: number;
  columnCount?: number;
  sizeBytes?: number;
  sensitivity?: DataSensitivity;
  dataClassifications?: string[];
  piiFields?: string[];
  personalData?: boolean;
  criticalData?: boolean;
  ownerId?: string;
  stewardId?: string;
  domainId?: string;
  glossaryTermIds?: string[];
  tags?: string[];
  lineageUpstream?: string[];
  lineageDownstream?: string[];
  lastProfiledAt?: string;
  lastScannedAt?: string;
  qualityScore?: number;
  qualityGrade?: 'A' | 'B' | 'C' | 'D' | 'F';
  retentionPolicyId?: string;
  encryptionAtRest?: boolean;
  maskedInNonProd?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Data Column / Field Types ─────────────────────────────────────────

export type DataType =
  | 'string'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'json'
  | 'array'
  | 'binary'
  | 'uuid';

export interface DataField {
  fieldId: string;
  tenantId?: string;
  assetId?: string;
  name: string;
  description?: string;
  dataType?: DataType;
  nullable?: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isIndexed?: boolean;
  sensitivity?: DataSensitivity;
  pii?: boolean;
  piiCategory?: string;
  personalData?: boolean;
  masking?: DataMaskingConfig;
  sampleValues?: string[];
  nullCount?: number;
  distinctCount?: number;
  minValue?: string;
  maxValue?: string;
  avgValue?: string;
  stdDeviation?: number;
  glossaryTermIds?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface DataMaskingConfig {
  enabled?: boolean;
  method?: 'redaction' | 'hashing' | 'tokenization' | 'substitution' | 'nullification' | 'format_preserving';
  pattern?: string;
  appliesTo?: 'non_prod' | 'all' | 'external';
}

// ── Data Domain Types ─────────────────────────────────────────────────

export interface DataDomain {
  domainId: string;
  tenantId: string;
  name: string;
  description?: string;
  ownerId?: string;
  stewardIds?: string[];
  parentDomainId?: string;
  subDomains?: string[];
  assetIds?: string[];
  glossaryIds?: string[];
  color?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Business Glossary Types ───────────────────────────────────────────

export type GlossaryTermStatus = 'draft' | 'under_review' | 'approved' | 'deprecated';

export interface GlossaryTerm {
  termId: string;
  tenantId: string;
  name: string;
  definition?: string;
  examples?: string[];
  domainId?: string;
  parentTermId?: string;
  acronym?: string;
  synonyms?: string[];
  antonyms?: string[];
  relatedTermIds?: string[];
  status?: GlossaryTermStatus;
  ownerId?: string;
  approvedBy?: string;
  approvedAt?: string;
  linkedAssetIds?: string[];
  linkedFieldIds?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Data Lineage Types ────────────────────────────────────────────────

export type LineageRelationType = 'derives_from' | 'writes_to' | 'reads_from' | 'copies_from' | 'transforms';

export interface LineageEdge {
  edgeId: string;
  tenantId?: string;
  sourceAssetId: string;
  targetAssetId: string;
  relationType?: LineageRelationType;
  transformationId?: string;
  transformationDescription?: string;
  pipelineId?: string;
  pipelineName?: string;
  fields?: LineageFieldMapping[];
  metadata?: Record<string, unknown>;
  discoveredAt?: string;
  updatedAt?: string;
}

export interface LineageFieldMapping {
  sourceField?: string;
  targetField?: string;
  transformExpression?: string;
}

export interface DataPipeline {
  pipelineId: string;
  tenantId: string;
  name: string;
  description?: string;
  type?: 'batch' | 'streaming' | 'micro_batch' | 'cdc';
  status?: 'active' | 'inactive' | 'paused' | 'failed';
  technology?: string;
  scheduleExpression?: string;
  sourceSystemIds?: string[];
  targetSystemIds?: string[];
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed' | 'partial' | 'running';
  avgRunDurationSeconds?: number;
  ownerId?: string;
  slaMinutes?: number;
  alertOnFailure?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Data Quality Types ────────────────────────────────────────────────

export type DQRuleType =
  | 'completeness'
  | 'uniqueness'
  | 'validity'
  | 'accuracy'
  | 'consistency'
  | 'timeliness'
  | 'referential_integrity'
  | 'custom_sql';

export type DQRuleSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface DataQualityRule {
  ruleId: string;
  tenantId: string;
  name: string;
  description?: string;
  type: DQRuleType;
  severity?: DQRuleSeverity;
  assetId?: string;
  fieldName?: string;
  expression?: string;
  threshold?: number;
  unit?: '%' | 'count' | 'days';
  dimensionWeight?: number;
  isActive?: boolean;
  ownerId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface DataQualityResult {
  resultId: string;
  tenantId?: string;
  ruleId?: string;
  assetId?: string;
  runId?: string;
  runAt: string;
  passed?: boolean;
  score?: number;
  totalRows?: number;
  failingRows?: number;
  failurePct?: number;
  sampledRows?: number;
  details?: string;
  errorSamples?: Record<string, unknown>[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface DataQualityProfile {
  profileId: string;
  tenantId?: string;
  assetId?: string;
  profiledAt: string;
  rowCount?: number;
  columnCount?: number;
  overallScore?: number;
  completenessScore?: number;
  uniquenessScore?: number;
  validityScore?: number;
  consistencyScore?: number;
  timelinessScore?: number;
  fieldProfiles?: DataFieldProfile[];
  anomalyCount?: number;
  anomalies?: DataAnomaly[];
}

export interface DataFieldProfile {
  fieldName: string;
  dataType?: DataType;
  nullCount?: number;
  nullPct?: number;
  distinctCount?: number;
  distinctPct?: number;
  minValue?: string;
  maxValue?: string;
  avgValue?: string;
  stdDeviation?: number;
  patternMatches?: Record<string, number>;
  outlierCount?: number;
  qualityScore?: number;
}

export interface DataAnomaly {
  anomalyId: string;
  assetId?: string;
  fieldName?: string;
  type?: 'volume_change' | 'schema_change' | 'null_spike' | 'distribution_shift' | 'format_change';
  severity?: DQRuleSeverity;
  detectedAt?: string;
  description?: string;
  expectedValue?: string;
  actualValue?: string;
  status?: 'open' | 'investigating' | 'resolved' | 'accepted';
}

// ── Data Retention Types ──────────────────────────────────────────────

export type RetentionBasis =
  | 'legal_requirement'
  | 'contractual'
  | 'business_need'
  | 'regulatory'
  | 'archival'
  | 'operational';

export interface DataRetentionPolicy {
  policyId: string;
  tenantId: string;
  name: string;
  description?: string;
  basis?: RetentionBasis;
  retentionPeriodDays?: number;
  archivePeriodDays?: number;
  disposalMethod?: 'deletion' | 'anonymization' | 'archival' | 'transfer';
  legalHoldCapable?: boolean;
  regulatoryRef?: string;
  assetIds?: string[];
  dataClassifications?: string[];
  ownerId?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LegalHold {
  holdId: string;
  tenantId: string;
  name: string;
  description?: string;
  reason?: string;
  status?: 'active' | 'released';
  issuedBy?: string;
  issuedAt: string;
  releasedAt?: string;
  dataCustodians?: string[];
  assetIds?: string[];
  custodianNotifiedAt?: string;
  legalMatterRef?: string;
  metadata?: Record<string, unknown>;
}

// ── Data Governance Dashboard ─────────────────────────────────────────

export interface DataGovernanceDashboard {
  tenantId: string;
  asOf: string;
  catalogedAssets?: number;
  documentedAssets?: number;
  ownedAssets?: number;
  criticalDataAssets?: number;
  piiAssets?: number;
  openDQIssues?: number;
  avgQualityScore?: number;
  glossaryTermCount?: number;
  approvedTerms?: number;
  activeRetentionPolicies?: number;
  activeLegalHolds?: number;
  openAnomalies?: number;
  lineageCoverage?: number;
  recentAnomalies?: Array<{ anomalyId: string; assetId?: string; type?: string; severity?: string; detectedAt?: string }>;
  domainQualityScores?: Array<{ domainId: string; domainName?: string; avgScore?: number; assetCount?: number }>;
}
