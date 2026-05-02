/**
 * Wave 14 — GCP Asset Inventory CCM connector (reference implementation).
 *
 * GCP Cloud Asset Inventory + Security Health Analytics emits findings on
 * resource configurations. This connector pulls findings from the
 * Security Command Center API and maps to compliance controls.
 *
 * Production wiring uses @google-cloud/security-center.
 */
import {
  type CcmConnector,
  type CcmConnectorTenantConfig,
  type CcmEvaluationResult,
  type CcmFinding,
  type CcmHealthReport,
  buildFinding,
  registerCcmConnector,
} from './connector.contract';

interface GcpScrFinding {
  name: string;
  category: string;
  resourceName: string;
  state: 'ACTIVE' | 'INACTIVE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  eventTime: string;
  description?: string;
}

const SEVERITY_MAP: Record<GcpScrFinding['severity'], 'critical' | 'high' | 'medium' | 'low'> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export class GcpAssetInventoryConnector implements CcmConnector {
  readonly connectorId = 'gcp-asset-inventory' as const;
  readonly displayName = 'GCP Asset Inventory + Security Command Center';
  readonly nativeFrameworks = ['CIS-GCP', 'PCI-DSS', 'ISO-27001', 'NIST-CSF'];

  private config: CcmConnectorTenantConfig | null = null;

  async configure(config: CcmConnectorTenantConfig): Promise<void> { this.config = config; }

  async healthCheck(): Promise<CcmHealthReport> {
    return {
      ok: false,
      connectorId: this.connectorId,
      authValid: false,
      permissionsValid: false,
      reachable: false,
      reason: 'GCP SDK not wired (Wave 14 follow-up: install @google-cloud/security-center)',
      checkedAt: new Date().toISOString(),
    };
  }

  async evaluate(opts: { tenantId: string; mappedControls: Array<{ controlCode: string; vendorCheckIds?: string[] }> }): Promise<CcmEvaluationResult> {
    const startedAt = new Date().toISOString();
    return {
      connectorId: this.connectorId,
      tenantId: opts.tenantId,
      startedAt,
      completedAt: new Date().toISOString(),
      resourcesScanned: 0,
      findingsTotal: 0,
      findingsBySeverity: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      errors: [{ message: 'GCP SDK not wired — production wiring lists SCC findings via SecurityCenter.listFindings' }],
      findings: [],
    };
  }

  static normalizeFinding(
    f: GcpScrFinding,
    tenantId: string,
    categoryToControls: Map<string, string[]>,
  ): CcmFinding | null {
    if (f.state !== 'ACTIVE') return null;
    return buildFinding({
      externalId: f.name,
      connectorId: 'gcp-asset-inventory',
      tenantId,
      title: `GCP SCC: ${f.category}`,
      description: f.description ?? `Resource ${f.resourceName} flagged by ${f.category}`,
      severity: SEVERITY_MAP[f.severity],
      status: 'open',
      resourceId: f.resourceName,
      resourceType: f.resourceName.split('/').slice(-2)[0] ?? 'gcp-resource',
      mappedControlCodes: categoryToControls.get(f.category) ?? [],
      vendorCheckId: f.category,
      detectedAt: f.eventTime,
      evidence: { json: { name: f.name, category: f.category } },
    });
  }
}

registerCcmConnector('gcp-asset-inventory', () => new GcpAssetInventoryConnector());
