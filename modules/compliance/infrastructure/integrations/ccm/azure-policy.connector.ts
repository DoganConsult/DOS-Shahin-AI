/**
 * Wave 14 — Azure Policy CCM connector.
 *
 * Fetches non-compliant resources from Azure Policy Insights using
 * Azure REST API with Bearer token auth — no @azure SDK dependency needed.
 *
 * Required Azure RBAC roles:
 *   Reader (subscription scope) — to list policy states
 *   Policy Insights Data Reader — to query compliance states
 *
 * Tenant credentials expected in config.config:
 *   { tenantId, clientId, clientSecret, subscriptionId }
 *   (service-principal / client-credentials flow)
 */
import { request as httpsRequest } from 'node:https';
import {
  type CcmConnector,
  type CcmConnectorTenantConfig,
  type CcmEvaluationResult,
  type CcmFinding,
  type CcmHealthReport,
  buildFinding,
  registerCcmConnector,
} from './connector.contract.js';

interface AzureCreds {
  azureTenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
}

interface AzurePolicyState {
  policyDefinitionId: string;
  policyDefinitionName: string;
  resourceId: string;
  resourceType: string;
  complianceState: 'NonCompliant' | 'Compliant' | 'Unknown';
  timestamp: string;
}

const SEVERITY_BY_POLICY_NAME: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  'storage-account-public-access-disabled': 'critical',
  'sql-server-tde-enabled': 'high',
  'kubernetes-cluster-rbac-enabled': 'critical',
  'audit-vm-without-managed-disks': 'medium',
  'audit-network-watcher-enabled': 'low',
};

// ─── Azure REST helpers ───────────────────────────────────────────────────

function httpsPost(hostname: string, path: string, body: string, headers: Record<string, string>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      { hostname, port: 443, path, method: 'POST', headers },
      (res) => {
        let data = '';
        res.on('data', (c: string) => (data += c));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`Azure parse error: ${data}`)); }
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(20_000, () => req.destroy(new Error('Azure request timeout')));
    req.write(body);
    req.end();
  });
}

function httpsGet(hostname: string, path: string, token: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      { hostname, port: 443, path, method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
      (res) => {
        let data = '';
        res.on('data', (c: string) => (data += c));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`Azure parse error: ${data}`)); }
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(20_000, () => req.destroy(new Error('Azure GET timeout')));
    req.end();
  });
}

async function getAzureToken(creds: AzureCreds): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    scope: 'https://management.azure.com/.default',
  }).toString();

  const result = await httpsPost(
    'login.microsoftonline.com',
    `/${creds.azureTenantId}/oauth2/v2.0/token`,
    body,
    { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': String(Buffer.byteLength(body)) },
  ) as { access_token?: string; error?: string; error_description?: string };

  if (!result.access_token) {
    throw new Error(`Azure auth failed: ${result.error} — ${result.error_description}`);
  }
  return result.access_token;
}

async function listPolicyStates(creds: AzureCreds, token: string): Promise<AzurePolicyState[]> {
  const states: AzurePolicyState[] = [];
  let url = `/subscriptions/${creds.subscriptionId}/providers/Microsoft.PolicyInsights/policyStates/latest/queryResults?api-version=2019-10-01&$filter=complianceState eq 'NonCompliant'&$top=1000`;

  while (url) {
    const result = await httpsGet('management.azure.com', url, token) as {
      value?: Array<{
        policyDefinitionId?: string;
        policyDefinitionName?: string;
        resourceId?: string;
        resourceType?: string;
        complianceState?: string;
        timestamp?: string;
      }>;
      '@odata.nextLink'?: string;
    };

    for (const s of result.value ?? []) {
      states.push({
        policyDefinitionId: s.policyDefinitionId ?? '',
        policyDefinitionName: s.policyDefinitionName ?? '',
        resourceId: s.resourceId ?? '',
        resourceType: s.resourceType ?? '',
        complianceState: (s.complianceState as AzurePolicyState['complianceState']) ?? 'Unknown',
        timestamp: s.timestamp ?? new Date().toISOString(),
      });
    }
    // Azure returns a full URL in nextLink
    const nextLink = result['@odata.nextLink'];
    if (nextLink) {
      url = nextLink.replace('https://management.azure.com', '');
    } else {
      break;
    }
  }
  return states;
}

// ─── Connector ────────────────────────────────────────────────────────────

export class AzurePolicyConnector implements CcmConnector {
  readonly connectorId = 'azure-policy' as const;
  readonly displayName = 'Azure Policy';
  readonly nativeFrameworks = ['ISO-27001', 'NIST-SP-800-53', 'PCI-DSS', 'CIS-Azure', 'Azure-Security-Benchmark'];

  private config: CcmConnectorTenantConfig | null = null;

  async configure(config: CcmConnectorTenantConfig): Promise<void> {
    this.config = config;
  }

  private getCreds(): AzureCreds {
    const c = this.config!.config as Record<string, string>;
    if (!c.azureTenantId || !c.clientId || !c.clientSecret || !c.subscriptionId) {
      throw new Error('azure-policy: missing azureTenantId, clientId, clientSecret, or subscriptionId');
    }
    return { azureTenantId: c.azureTenantId, clientId: c.clientId, clientSecret: c.clientSecret, subscriptionId: c.subscriptionId };
  }

  async healthCheck(): Promise<CcmHealthReport> {
    if (!this.config) {
      return { ok: false, connectorId: this.connectorId, authValid: false, permissionsValid: false, reachable: false, reason: 'not configured', checkedAt: new Date().toISOString() };
    }
    try {
      const creds = this.getCreds();
      const token = await getAzureToken(creds);
      // Probe: list subscription-level policy assignments (cheap, Reader-level)
      const result = await httpsGet(
        'management.azure.com',
        `/subscriptions/${creds.subscriptionId}/providers/Microsoft.Authorization/policyAssignments?api-version=2022-06-01&$top=1`,
        token,
      ) as Record<string, unknown>;
      const ok = !('error' in result);
      return {
        ok,
        connectorId: this.connectorId,
        authValid: ok,
        permissionsValid: ok,
        reachable: true,
        reason: ok ? 'Connected to Azure Policy' : `Azure error: ${JSON.stringify(result['error'])}`,
        checkedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, connectorId: this.connectorId, authValid: false, permissionsValid: false, reachable: false, reason: msg, checkedAt: new Date().toISOString() };
    }
  }

  async evaluate(opts: {
    tenantId: string;
    mappedControls: Array<{ controlCode: string; vendorCheckIds?: string[] }>;
  }): Promise<CcmEvaluationResult> {
    if (!this.config) throw new Error('not configured');
    const startedAt = new Date().toISOString();
    const findings: CcmFinding[] = [];
    const errors: Array<{ resourceId?: string; message: string }> = [];

    const policyToControls = new Map<string, string[]>();
    for (const m of opts.mappedControls) {
      for (const checkId of m.vendorCheckIds ?? []) {
        const list = policyToControls.get(checkId) ?? [];
        list.push(m.controlCode);
        policyToControls.set(checkId, list);
      }
    }

    try {
      const creds = this.getCreds();
      const token = await getAzureToken(creds);
      const states = await listPolicyStates(creds, token);

      for (const state of states) {
        const finding = AzurePolicyConnector.normalizeState(state, opts.tenantId, policyToControls);
        if (finding) findings.push(finding);
      }
    } catch (err: unknown) {
      errors.push({ message: err instanceof Error ? err.message : String(err) });
    }

    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;

    return {
      connectorId: this.connectorId,
      tenantId: opts.tenantId,
      startedAt,
      completedAt: new Date().toISOString(),
      resourcesScanned: findings.length + errors.length,
      findingsTotal: findings.length,
      findingsBySeverity: bySeverity,
      errors,
      findings,
    };
  }

  /**
   * Pure normalizer — convert an Azure Policy state into a CcmFinding.
   * Fully testable without Azure credentials.
   */
  static normalizeState(
    state: AzurePolicyState,
    tenantId: string,
    policyToControls: Map<string, string[]>,
  ): CcmFinding | null {
    if (state.complianceState !== 'NonCompliant') return null;
    return buildFinding({
      externalId: `${state.resourceId}/${state.policyDefinitionId}`,
      connectorId: 'azure-policy',
      tenantId,
      title: `Azure Policy: ${state.policyDefinitionName}`,
      description: `Resource ${state.resourceId} non-compliant with policy ${state.policyDefinitionName}`,
      severity: SEVERITY_BY_POLICY_NAME[state.policyDefinitionName] ?? 'medium',
      status: 'open',
      resourceId: state.resourceId,
      resourceType: state.resourceType,
      mappedControlCodes: policyToControls.get(state.policyDefinitionName) ?? [],
      vendorCheckId: state.policyDefinitionName,
      detectedAt: state.timestamp,
      evidence: {
        json: { policyDefinitionId: state.policyDefinitionId, timestamp: state.timestamp },
      },
    });
  }
}

registerCcmConnector('azure-policy', () => new AzurePolicyConnector());
