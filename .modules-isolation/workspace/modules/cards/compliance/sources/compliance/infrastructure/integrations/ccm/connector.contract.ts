/**
 * Wave 14+15 — Continuous Control Monitoring (CCM) connector framework.
 *
 * Each cloud / SaaS / IAM connector implements CcmConnector. The framework
 * runs connectors on a schedule (Wave 40 drift scheduler), normalizes
 * findings → compliance gaps, and auto-attaches evidence.
 *
 * Connector lifecycle:
 *   1. configure(tenantConfig)  — supply credentials, region, scope
 *   2. healthCheck()             — verify auth + permissions
 *   3. listResources()           — enumerate the in-scope assets
 *   4. evaluate(controlMappings) — for each mapped control, check posture
 *   5. emitEvidence(findings)    — push evidence rows to compliance_evidence_links
 *   6. emitGaps(findings)        — open compliance_gaps for failed controls
 *
 * Concrete connectors live in /aws-config/, /azure-policy/, /gcp-asset/,
 * /okta/, /servicenow/, /github/, /jira/, /pagerduty/.
 */

export type CcmConnectorId =
  | 'aws-config'
  | 'aws-cloudtrail'
  | 'aws-security-hub'
  | 'azure-policy'
  | 'azure-activity-log'
  | 'azure-defender'
  | 'gcp-asset-inventory'
  | 'gcp-audit-logs'
  | 'okta-scim'
  | 'azure-ad'
  | 'google-workspace'
  | 'servicenow-cmdb'
  | 'servicenow-itsm'
  | 'github'
  | 'gitlab'
  | 'jira'
  | 'pagerduty'
  | 'slack-org'
  | 'microsoft-365';

export type CcmFindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type CcmFindingStatus = 'open' | 'acknowledged' | 'remediated' | 'risk-accepted' | 'false-positive';

export interface CcmConnectorTenantConfig {
  tenantId: string;
  connectorId: CcmConnectorId;
  /** Customer-supplied creds. Stored encrypted via Wave 11 CMEK. */
  credentialsRef: string;
  /** Connector-specific config (regions, scopes, project IDs, etc.). */
  config: Record<string, unknown>;
  /** Cron expression for scheduled evaluation. */
  schedule: string;
  /** When set, connector runs but does not auto-create findings. */
  dryRun: boolean;
  enabled: boolean;
}

export interface CcmFinding {
  /** Unique stable ID for dedup across runs (e.g., resource ARN + check ID). */
  externalId: string;
  connectorId: CcmConnectorId;
  tenantId: string;
  /** What's wrong, in vendor parlance. */
  title: string;
  description: string;
  severity: CcmFindingSeverity;
  status: CcmFindingStatus;
  /** Affected resource (ARN, URI, GUID). */
  resourceId: string;
  resourceType: string;
  /** Map this finding to N compliance controls. */
  mappedControlCodes: string[];
  /** Vendor-supplied evidence URL/blob. */
  evidence?: {
    url?: string;
    text?: string;
    json?: Record<string, unknown>;
  };
  /** Vendor's own check identifier (NIST 800-53 mapping, CIS benchmark, etc.). */
  vendorCheckId?: string;
  detectedAt: string;
}

export interface CcmEvaluationResult {
  connectorId: CcmConnectorId;
  tenantId: string;
  startedAt: string;
  completedAt: string;
  resourcesScanned: number;
  findingsTotal: number;
  findingsBySeverity: Record<CcmFindingSeverity, number>;
  errors: Array<{ resourceId?: string; message: string }>;
  findings: CcmFinding[];
}

export interface CcmHealthReport {
  ok: boolean;
  connectorId: CcmConnectorId;
  authValid: boolean;
  permissionsValid: boolean;
  reachable: boolean;
  reason?: string;
  checkedAt: string;
}

export interface CcmConnector {
  readonly connectorId: CcmConnectorId;
  readonly displayName: string;
  /** Frameworks this connector natively maps findings to. */
  readonly nativeFrameworks: string[];

  configure(config: CcmConnectorTenantConfig): Promise<void>;
  healthCheck(): Promise<CcmHealthReport>;
  evaluate(opts: { tenantId: string; mappedControls: Array<{ controlCode: string; vendorCheckIds?: string[] }> }): Promise<CcmEvaluationResult>;
}

/**
 * Connector registry — central lookup. Concrete connectors register
 * themselves at module bootstrap.
 */
const REGISTRY = new Map<CcmConnectorId, () => CcmConnector>();

export function registerCcmConnector(id: CcmConnectorId, factory: () => CcmConnector): void {
  REGISTRY.set(id, factory);
}

export function getCcmConnector(id: CcmConnectorId): CcmConnector {
  const f = REGISTRY.get(id);
  if (!f) throw new Error(`unknown CCM connector: ${id}. Register at bootstrap.`);
  return f();
}

export function listRegisteredCcmConnectors(): CcmConnectorId[] {
  return [...REGISTRY.keys()];
}

/**
 * Helper for connectors: convert a vendor finding into the canonical
 * CcmFinding shape. Concrete connectors call this to keep their output
 * uniform.
 */
export function buildFinding(input: Omit<CcmFinding, 'detectedAt'> & { detectedAt?: string }): CcmFinding {
  return {
    detectedAt: input.detectedAt ?? new Date().toISOString(),
    ...input,
  };
}
