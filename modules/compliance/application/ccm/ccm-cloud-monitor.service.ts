import { logger } from '../../ports/logger.port';
// ============================================
// F07: CCM Cloud Monitor Service
// Polls AWS Config / Azure Policy compliance
// and maps results to AGRC-OS controls.
// Bridges gap vs ServiceNow ComplianceCow.
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { swallowNull, EC , catchHandler } from '@dos/platform-core/resilience';

export interface CloudComplianceResult {
  controlId: string;
  cloudProvider: 'aws' | 'azure' | 'gcp';
  resourceType: string;
  compliant: boolean;
  detail: string;
  timestamp: Date;
}

export async function pollAWSConfig(tenantId: string, awsConfig: {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}): Promise<CloudComplianceResult[]> {
  const schema = tenantSchema(tenantId);

  const mappings = await safeQuery(
    `SELECT control_id, cloud_rule_id FROM "${schema}".ccm_cloud_mappings
     WHERE cloud_provider = 'aws' AND enabled = true`,
    [],
  );
  if (!mappings.rows.length) return [];

  let ConfigServiceClient: any, GetComplianceDetailsByConfigRuleCommand: any;
  try {
    const mod = await import('@aws-sdk/client-config-service' as any);
    ConfigServiceClient = mod.ConfigServiceClient;
    GetComplianceDetailsByConfigRuleCommand = mod.GetComplianceDetailsByConfigRuleCommand;
  } catch {
    logger.warn('[CCMCloud] @aws-sdk/client-config-service not installed — skipping AWS poll');
    return [];
  }

  const client = new ConfigServiceClient({
    region: awsConfig.region,
    credentials: {
      accessKeyId: awsConfig.accessKeyId,
      secretAccessKey: awsConfig.secretAccessKey,
    },
  });

  const results: CloudComplianceResult[] = [];
  for (const mapping of mappings.rows) {
    try {
      const cmd = new GetComplianceDetailsByConfigRuleCommand({
        ConfigRuleName: mapping.cloud_rule_id,
      });
      const response = await client.send(cmd);
      for (const eval_ of response.EvaluationResults || []) {
        results.push({
          controlId: mapping.control_id,
          cloudProvider: 'aws',
          resourceType: eval_.EvaluationResultIdentifier?.EvaluationResultQualifier?.ResourceType || '',
          compliant: eval_.ComplianceType === 'COMPLIANT',
          detail: eval_.Annotation || '',
          timestamp: eval_.ResultRecordedTime || new Date(),
        });
      }
    } catch (err: unknown) {
      logger.error(`[CCMCloud] AWS poll failed for rule ${mapping.cloud_rule_id}:`, toErrorMessage(err));
    }
  }

  await persistCCMResults(tenantId, results);
  return results;
}

export async function pollAzurePolicy(tenantId: string, azureConfig: {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  subscriptionId: string;
}): Promise<CloudComplianceResult[]> {
  const schema = tenantSchema(tenantId);
  const mappings = await safeQuery(
    `SELECT control_id, cloud_rule_id FROM "${schema}".ccm_cloud_mappings
     WHERE cloud_provider = 'azure' AND enabled = true`,
    [],
  );
  if (!mappings.rows.length) return [];

  // Azure Policy compliance via REST API (no heavy SDK required)
  const tokenRes = await swallowNull(EC.FALLBACK_QUERY, fetch(
    `https://login.microsoftonline.com/${azureConfig.tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: azureConfig.clientId,
        client_secret: azureConfig.clientSecret,
        scope: 'https://management.azure.com/.default',
        grant_type: 'client_credentials',
      }),
    },
  ), { tenantId: tenantId, operation: 'fallback query' });

  if (!tokenRes?.ok) {
    logger.warn('[CCMCloud] Azure token fetch failed');
    return [];
  }

  const tokenJson = await tokenRes.json() as { access_token: string };
  const { access_token } = tokenJson;
  const results: CloudComplianceResult[] = [];

  for (const mapping of mappings.rows) {
    try {
      const url = `https://management.azure.com/subscriptions/${azureConfig.subscriptionId}/providers/Microsoft.PolicyInsights/policyStates/latest/queryResults?api-version=2019-10-01&$filter=PolicyDefinitionName eq '${mapping.cloud_rule_id}'`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) continue;
      const data = await res.json() as { value?: unknown[] };
      for (const state of data.value || []) {
        results.push({
          controlId: mapping.control_id,
          cloudProvider: 'azure',

          resourceType: state.resourceType || '',

          compliant: state.complianceState === 'Compliant',

          detail: state.policyDefinitionName || '',
          timestamp: new Date(),
        });
      }
    } catch (err: unknown) {
      logger.error(`[CCMCloud] Azure poll failed for ${mapping.cloud_rule_id}:`, toErrorMessage(err));
    }
  }

  await persistCCMResults(tenantId, results);
  return results;
}

async function persistCCMResults(tenantId: string, results: CloudComplianceResult[]): Promise<void> {
  const schema = tenantSchema(tenantId);
  for (const r of results) {
    await safeQuery(
      `INSERT INTO "${schema}".ccm_results
       (control_id, cloud_provider, resource_type, compliant, detail, checked_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [r.controlId, r.cloudProvider, r.resourceType, r.compliant, r.detail, r.timestamp],
    ).catch(catchHandler(EC.EVENT_BUS, {}));

    if (!r.compliant) {
      eventBus.publish(({
              eventType: 'control.failed',
              tenantId,
              sourceService: 'CCMCloudMonitorService',
              severity: 'warning',
              entityType: 'control',
              entityId: r.controlId,
              payload: { cloudProvider: r.cloudProvider, detail: r.detail },
            } as any));
    }
  }
}

export async function getCCMCloudSummary(tenantId: string): Promise<{
  totalChecked: number;
  compliant: number;
  nonCompliant: number;
  byProvider: Record<string, { compliant: number; nonCompliant: number }>;
  latestResults: unknown[];
}> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT cloud_provider, compliant, COUNT(*)::int as cnt
     FROM "${schema}".ccm_results
     WHERE checked_at > NOW() - INTERVAL '24 hours'
     GROUP BY cloud_provider, compliant`,
    [],
  );

  const byProvider: Record<string, { compliant: number; nonCompliant: number }> = {};
  let totalCompliant = 0, totalNonCompliant = 0;
  for (const r of res.rows) {
    if (!byProvider[r.cloud_provider]) byProvider[r.cloud_provider] = { compliant: 0, nonCompliant: 0 };
    if (r.compliant) { byProvider[r.cloud_provider].compliant += r.cnt; totalCompliant += r.cnt; }
    else { byProvider[r.cloud_provider].nonCompliant += r.cnt; totalNonCompliant += r.cnt; }
  }

  const latestRes = await safeQuery(
    `SELECT DISTINCT ON (control_id, cloud_provider) *
     FROM "${schema}".ccm_results ORDER BY control_id, cloud_provider, checked_at DESC LIMIT 50`,
    [],
  );

  return {
    totalChecked: totalCompliant + totalNonCompliant,
    compliant: totalCompliant,
    nonCompliant: totalNonCompliant,
    byProvider,
    latestResults: latestRes.rows,
  };
}

export async function addCCMCloudMapping(tenantId: string, mapping: {
  controlId: string;
  cloudProvider: 'aws' | 'azure' | 'gcp';
  cloudRuleId: string;
}): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".ccm_cloud_mappings (control_id, cloud_provider, cloud_rule_id)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [mapping.controlId, mapping.cloudProvider, mapping.cloudRuleId],
  );
}
