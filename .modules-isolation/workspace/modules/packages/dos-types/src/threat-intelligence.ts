/**
 * @dos/types — threat intelligence and cyber defense types
 * Covers TIPs, MITRE ATT&CK, threat actors, campaigns, SOAR, dark web monitoring
 */

// ── Threat Intelligence Platform Types ────────────────────────────────

export type TIFeedType = 'osint' | 'isac' | 'commercial' | 'government' | 'internal' | 'dark_web';
export type TIFeedStatus = 'active' | 'inactive' | 'degraded' | 'paused';

export interface ThreatIntelligenceFeed {
  feedId: string;
  tenantId: string;
  name: string;
  description?: string;
  type?: TIFeedType;
  status?: TIFeedStatus;
  provider?: string;
  url?: string;
  format?: 'stix' | 'taxii' | 'misp' | 'json' | 'csv' | 'xml' | 'text';
  apiKeyRef?: string;
  pollingIntervalMins?: number;
  lastPolledAt?: string;
  lastItemCount?: number;
  totalItemsIngested?: number;
  avgDailyItems?: number;
  confidence?: number;
  categories?: string[];
  tlpLevel?: 'white' | 'green' | 'amber' | 'red';
  enabledIndicatorTypes?: string[];
  ownerId?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Threat Actor Types ────────────────────────────────────────────────

export type ThreatActorType =
  | 'nation_state'
  | 'criminal_group'
  | 'hacktivist'
  | 'insider'
  | 'terrorist'
  | 'unknown';

export type ThreatActorSophistication = 'advanced_persistent' | 'high' | 'medium' | 'low' | 'unknown';

export interface ThreatActor {
  actorId: string;
  tenantId?: string;
  name: string;
  aliases?: string[];
  type?: ThreatActorType;
  sophistication?: ThreatActorSophistication;
  motivation?: string[];
  originCountries?: string[];
  targetSectors?: string[];
  targetRegions?: string[];
  activeSince?: string;
  lastSeenAt?: string;
  ttps?: string[];
  malwareFamilies?: string[];
  capabilityScore?: number;
  intentScore?: number;
  opportunityScore?: number;
  threatScore?: number;
  description?: string;
  references?: string[];
  mitreAptId?: string;
  stixId?: string;
  isActive?: boolean;
  associatedCampaignIds?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Threat Campaign Types ────────────────────────────────────────────

export type CampaignStatus = 'active' | 'historical' | 'suspected' | 'unknown';

export interface ThreatCampaign {
  campaignId: string;
  tenantId?: string;
  name: string;
  description?: string;
  actorIds?: string[];
  status?: CampaignStatus;
  firstObserved?: string;
  lastObserved?: string;
  targetSectors?: string[];
  targetCountries?: string[];
  objectives?: string[];
  ttps?: MitreTTP[];
  malwareIds?: string[];
  iocIds?: string[];
  severity?: 'critical' | 'high' | 'medium' | 'low';
  confidence?: number;
  stixId?: string;
  references?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── MITRE ATT&CK Types ────────────────────────────────────────────────

export type MitreMatrix = 'enterprise' | 'mobile' | 'ics';
export type MitreTacticId =
  | 'TA0001' | 'TA0002' | 'TA0003' | 'TA0004' | 'TA0005'
  | 'TA0006' | 'TA0007' | 'TA0008' | 'TA0009' | 'TA0010'
  | 'TA0011' | 'TA0040' | 'TA0042' | 'TA0043';

export interface MitreTTP {
  techniqueId: string;
  subtechniqueId?: string;
  name?: string;
  tactic?: MitreTacticId;
  matrix?: MitreMatrix;
  url?: string;
  platforms?: string[];
  dataSources?: string[];
  mitigations?: string[];
  detections?: string[];
}

export interface MitreCoverageMap {
  tenantId?: string;
  asOf?: string;
  matrix?: MitreMatrix;
  totalTechniques?: number;
  coveredTechniques?: number;
  testedTechniques?: number;
  coveragePct?: number;
  tacticsBreakdown?: Array<{ tacticId: MitreTacticId; name: string; total: number; covered: number }>;
  uncoveredTechniques?: string[];
  criticalGaps?: string[];
}

// ── Malware / Malicious Artifact Types ────────────────────────────────

export type MalwareType =
  | 'trojan'
  | 'ransomware'
  | 'worm'
  | 'rootkit'
  | 'spyware'
  | 'adware'
  | 'backdoor'
  | 'loader'
  | 'dropper'
  | 'infostealer'
  | 'cryptominer'
  | 'botnet'
  | 'apt_tool'
  | 'unknown';

export interface MalwareFamily {
  malwareId: string;
  tenantId?: string;
  name: string;
  aliases?: string[];
  type?: MalwareType;
  description?: string;
  firstSeen?: string;
  lastSeen?: string;
  actorIds?: string[];
  campaignIds?: string[];
  ttps?: string[];
  targetPlatforms?: string[];
  indicators?: string[];
  yaraRules?: string[];
  sandboxReports?: string[];
  cvss?: number;
  stixId?: string;
  references?: string[];
  metadata?: Record<string, unknown>;
}

// ── IOC Types (expanded) ──────────────────────────────────────────────

export type IOCType =
  | 'ip'
  | 'domain'
  | 'url'
  | 'file_hash_md5'
  | 'file_hash_sha1'
  | 'file_hash_sha256'
  | 'email'
  | 'registry_key'
  | 'mutex'
  | 'user_agent'
  | 'asn'
  | 'ssl_cert_fingerprint'
  | 'bitcoin_address'
  | 'cve'
  | 'yara_rule';

export type IOCConfidence = 'confirmed' | 'high' | 'medium' | 'low' | 'unknown';
export type IOCStatus = 'active' | 'expired' | 'falsepositive' | 'retired';

export interface IndicatorOfCompromise {
  iocId: string;
  tenantId?: string;
  type: IOCType;
  value: string;
  status?: IOCStatus;
  confidence?: IOCConfidence;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  tlpLevel?: 'white' | 'green' | 'amber' | 'red';
  sourceFeedId?: string;
  actorIds?: string[];
  campaignIds?: string[];
  malwareIds?: string[];
  firstSeen?: string;
  lastSeen?: string;
  expiresAt?: string;
  hitCount?: number;
  lastHitAt?: string;
  context?: string;
  tags?: string[];
  stixId?: string;
  feedRef?: string;
  whitelisted?: boolean;
  falsePositiveReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── SOAR Types ────────────────────────────────────────────────────────

export type PlaybookType =
  | 'phishing'
  | 'ransomware'
  | 'malware'
  | 'data_breach'
  | 'ddos'
  | 'insider_threat'
  | 'account_takeover'
  | 'supply_chain'
  | 'custom';

export type PlaybookStatus = 'draft' | 'active' | 'deprecated' | 'testing';

export interface SOARPlaybook {
  playbookId: string;
  tenantId: string;
  name: string;
  description?: string;
  type?: PlaybookType;
  status?: PlaybookStatus;
  version?: string;
  triggerConditions?: SOARTrigger[];
  steps?: SOARStep[];
  estimatedMinutes?: number;
  ownerId?: string;
  lastTestedAt?: string;
  testResult?: 'passed' | 'failed' | 'partial';
  runCount?: number;
  avgRunMinutes?: number;
  successRate?: number;
  tags?: string[];
  slaMinutes?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SOARTrigger {
  triggerId?: string;
  type?: 'alert' | 'ioc_match' | 'rule_fire' | 'manual' | 'schedule' | 'api';
  condition?: string;
  logicOp?: 'AND' | 'OR';
}

export interface SOARStep {
  stepId: string;
  order?: number;
  name?: string;
  type?: 'enrichment' | 'notification' | 'isolation' | 'blocking' | 'ticketing' | 'decision' | 'remediation' | 'custom';
  integrationId?: string;
  action?: string;
  parameters?: Record<string, unknown>;
  onSuccess?: string;
  onFailure?: string;
  isManual?: boolean;
  approvalRequired?: boolean;
  timeoutSeconds?: number;
}

export interface PlaybookRun {
  runId: string;
  playbookId?: string;
  tenantId?: string;
  triggeredBy?: 'alert' | 'ioc' | 'manual' | 'schedule';
  triggerRef?: string;
  status?: 'running' | 'completed' | 'failed' | 'cancelled' | 'waiting_approval';
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  stepResults?: PlaybookStepResult[];
  outcome?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface PlaybookStepResult {
  stepId?: string;
  stepName?: string;
  status?: 'success' | 'failed' | 'skipped' | 'timeout';
  startedAt?: string;
  completedAt?: string;
  output?: unknown;
  error?: string;
}

// ── Dark Web Monitoring Types ─────────────────────────────────────────

export type DarkWebAlertType =
  | 'credential_leak'
  | 'data_for_sale'
  | 'brand_mention'
  | 'threat_discussion'
  | 'ransomware_post'
  | 'executive_mention'
  | 'source_code_leak';

export interface DarkWebAlert {
  alertId: string;
  tenantId: string;
  type?: DarkWebAlertType;
  source?: string;
  sourceType?: 'dark_web_forum' | 'paste_site' | 'telegram' | 'ransomware_blog' | 'marketplace';
  title?: string;
  summary?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  confidence?: 'high' | 'medium' | 'low';
  detectedAt: string;
  keyword?: string;
  matchedAssets?: string[];
  actionTaken?: string;
  status?: 'new' | 'investigating' | 'resolved' | 'closed' | 'false_positive';
  assignedTo?: string;
  resolvedAt?: string;
  iocIds?: string[];
  credentialCount?: number;
  provider?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Cyber Threat Dashboard ────────────────────────────────────────────

export interface CyberThreatDashboard {
  tenantId: string;
  asOf: string;
  activeIOCs?: number;
  newIOCsLast7d?: number;
  activeActors?: number;
  activeCampaigns?: number;
  playbooksActive?: number;
  ongoingPlaybookRuns?: number;
  darkWebAlerts?: number;
  openDarkWebAlerts?: number;
  mitreCoverage?: number;
  avgConfidence?: number;
  iocsByType?: Record<string, number>;
  criticalAlertCount?: number;
  topThreatActors?: Array<{ actorId: string; name: string; threatScore?: number }>;
  recentCampaigns?: Array<{ campaignId: string; name: string; severity?: string; lastObserved?: string }>;
  recentAlerts?: Array<{ alertId: string; type?: string; severity?: string; detectedAt: string }>;
}
