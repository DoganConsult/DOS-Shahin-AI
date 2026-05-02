/**
 * Wave 14 — AWS Config CCM connector.
 *
 * Fetches compliance findings from AWS Config using AWS Signature Version 4
 * signed HTTPS requests directly — no @aws-sdk dependency required.
 *
 * Required IAM permissions:
 *   config:DescribeConfigRules
 *   config:DescribeComplianceByConfigRule
 *   config:GetComplianceDetailsByConfigRule
 *   sts:GetCallerIdentity (healthCheck only)
 *
 * Tenant credentials are expected in config.credentials:
 *   { accessKeyId, secretAccessKey, sessionToken?, region }
 */
import { createHmac, createHash } from 'node:crypto';
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

interface AwsCreds {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
}

interface AwsConfigEvalRow {
  configRuleName: string;
  resourceType: string;
  resourceId: string;
  complianceType: 'COMPLIANT' | 'NON_COMPLIANT' | 'NOT_APPLICABLE' | 'INSUFFICIENT_DATA';
  annotation?: string;
  resultRecordedTime: string;
}

const SEVERITY_BY_RULE: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
  'iam-root-access-key-check': 'critical',
  'iam-password-policy': 'high',
  'mfa-enabled-for-iam-console-access': 'critical',
  'cloudtrail-enabled': 'critical',
  's3-bucket-public-read-prohibited': 'critical',
  's3-bucket-public-write-prohibited': 'critical',
  's3-bucket-server-side-encryption-enabled': 'high',
  'rds-storage-encrypted': 'high',
  'ebs-encrypted-volumes': 'high',
  'cloudtrail-log-file-validation-enabled': 'medium',
  'cloudwatch-alarm-action-check': 'low',
};

function severityFor(ruleName: string): 'critical' | 'high' | 'medium' | 'low' {
  return SEVERITY_BY_RULE[ruleName] ?? 'medium';
}

// ─── AWS Signature V4 helpers ─────────────────────────────────────────────

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function sha256hex(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate    = hmac('AWS4' + secretKey, dateStamp);
  const kRegion  = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

function signedRequest(creds: AwsCreds, service: string, opts: {
  method: string;
  host: string;
  path: string;
  body: string;
  contentType?: string;
}): Record<string, string> {
  const now        = new Date();
  const amzDate    = now.toISOString().replace(/[:-]/g, '').replace(/\.\d{3}/, '');
  const dateStamp  = amzDate.slice(0, 8);
  const ct         = opts.contentType ?? 'application/x-amz-json-1.1';
  const bodyHash   = sha256hex(opts.body);

  const headers: Record<string, string> = {
    'content-type': ct,
    'host': opts.host,
    'x-amz-date': amzDate,
    'x-amz-target': '',
  };
  if (creds.sessionToken) headers['x-amz-security-token'] = creds.sessionToken;

  const signedHeaders = Object.keys(headers)
    .filter(k => k !== 'x-amz-target' || headers[k])
    .sort()
    .join(';');

  const canonicalHeaders = Object.keys(headers)
    .filter(k => k !== 'x-amz-target' || headers[k])
    .sort()
    .map(k => `${k}:${headers[k]}`)
    .join('\n') + '\n';

  const canonicalRequest = [
    opts.method, opts.path, '',
    canonicalHeaders, signedHeaders, bodyHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${creds.region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256', amzDate, credentialScope, sha256hex(canonicalRequest),
  ].join('\n');

  const signingKey = getSigningKey(creds.secretAccessKey, dateStamp, creds.region, service);
  const signature  = hmac(signingKey, stringToSign).toString('hex');

  return {
    ...headers,
    'Authorization': `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'x-amz-date': amzDate,
    'content-type': ct,
  };
}

function awsPost(creds: AwsCreds, target: string, body: string): Promise<unknown> {
  const host = `config.${creds.region}.amazonaws.com`;
  const headers = signedRequest(creds, 'config', {
    method: 'POST', host, path: '/', body, contentType: 'application/x-amz-json-1.1',
  });
  // Override the target header properly
  (headers as Record<string, string>)['x-amz-target'] = `StarlingDoveService.${target}`;

  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      { hostname: host, port: 443, path: '/', method: 'POST', headers },
      (res) => {
        let data = '';
        res.on('data', (c: string) => (data += c));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`AWS Config parse error: ${data}`)); }
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(15_000, () => req.destroy(new Error('AWS Config timeout')));
    req.write(body);
    req.end();
  });
}

// ─── Connector ────────────────────────────────────────────────────────────

export class AwsConfigConnector implements CcmConnector {
  readonly connectorId = 'aws-config' as const;
  readonly displayName = 'AWS Config';
  readonly nativeFrameworks = ['NIST-800-53', 'NIST-CSF', 'PCI-DSS', 'CIS-AWS', 'SOC2'];

  private config: CcmConnectorTenantConfig | null = null;

  async configure(config: CcmConnectorTenantConfig): Promise<void> {
    if (config.connectorId !== 'aws-config') {
      throw new Error(`expected aws-config config, got ${config.connectorId}`);
    }
    this.config = config;
  }

  private getCreds(): AwsCreds {
    const c = this.config!.config as Record<string, string>;
    if (!c.accessKeyId || !c.secretAccessKey || !c.region) {
      throw new Error('aws-config: missing accessKeyId, secretAccessKey, or region in config');
    }
    return {
      accessKeyId: c.accessKeyId,
      secretAccessKey: c.secretAccessKey,
      sessionToken: c.sessionToken,
      region: c.region,
    };
  }

  async healthCheck(): Promise<CcmHealthReport> {
    if (!this.config) {
      return { ok: false, connectorId: this.connectorId, authValid: false, permissionsValid: false, reachable: false, reason: 'not configured', checkedAt: new Date().toISOString() };
    }
    try {
      const creds = this.getCreds();
      // DescribeConfigurationRecorderStatus — lightweight probe
      const result = await awsPost(creds, 'DescribeConfigurationRecorderStatus', '{}') as Record<string, unknown>;
      const ok = !!(result && !('__type' in result && String(result.__type).includes('Exception')));
      return {
        ok,
        connectorId: this.connectorId,
        authValid: ok,
        permissionsValid: ok,
        reachable: true,
        reason: ok ? 'Connected to AWS Config' : `AWS error: ${JSON.stringify(result)}`,
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

    const ruleToControls = new Map<string, string[]>();
    for (const m of opts.mappedControls) {
      for (const checkId of m.vendorCheckIds ?? []) {
        const list = ruleToControls.get(checkId) ?? [];
        list.push(m.controlCode);
        ruleToControls.set(checkId, list);
      }
    }

    try {
      const creds = this.getCreds();
      let nextToken: string | undefined;
      do {
        const body = JSON.stringify(nextToken ? { NextToken: nextToken } : {});
        const rulesResult = await awsPost(creds, 'DescribeConfigRules', body) as {
          ConfigRules?: Array<{ ConfigRuleName: string }>;
          NextToken?: string;
        };
        nextToken = rulesResult.NextToken;

        for (const rule of rulesResult.ConfigRules ?? []) {
          const ruleName = rule.ConfigRuleName;
          if (!ruleToControls.has(ruleName) && ruleToControls.size > 0) continue;

          // Fetch non-compliant details for this rule
          let detailToken: string | undefined;
          do {
            const detailBody = JSON.stringify({
              ConfigRuleName: ruleName,
              ComplianceTypes: ['NON_COMPLIANT'],
              ...(detailToken ? { NextToken: detailToken } : {}),
            });
            const detail = await awsPost(creds, 'GetComplianceDetailsByConfigRule', detailBody) as {
              EvaluationResults?: Array<{
                EvaluationResultIdentifier: { EvaluationResultQualifier: { ResourceType: string; ResourceId: string } };
                ComplianceType: string;
                Annotation?: string;
                ResultRecordedTime?: string;
              }>;
              NextToken?: string;
            };
            detailToken = detail.NextToken;

            for (const ev of detail.EvaluationResults ?? []) {
              const row: AwsConfigEvalRow = {
                configRuleName: ruleName,
                resourceType: ev.EvaluationResultIdentifier.EvaluationResultQualifier.ResourceType,
                resourceId: ev.EvaluationResultIdentifier.EvaluationResultQualifier.ResourceId,
                complianceType: ev.ComplianceType as AwsConfigEvalRow['complianceType'],
                annotation: ev.Annotation,
                resultRecordedTime: ev.ResultRecordedTime ?? new Date().toISOString(),
              };
              const finding = AwsConfigConnector.normalizeRow(row, opts.tenantId, ruleToControls);
              if (finding) findings.push(finding);
            }
          } while (detailToken);
        }
      } while (nextToken);
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
   * Pure normalizer — convert an AWS Config evaluation row into a CcmFinding.
   * Fully testable without AWS credentials.
   */
  static normalizeRow(
    row: AwsConfigEvalRow,
    tenantId: string,
    ruleToControls: Map<string, string[]>,
  ): CcmFinding | null {
    if (row.complianceType !== 'NON_COMPLIANT') return null;
    return buildFinding({
      externalId: `${row.resourceType}/${row.resourceId}/${row.configRuleName}`,
      connectorId: 'aws-config',
      tenantId,
      title: `AWS Config: ${row.configRuleName}`,
      description: row.annotation ?? `Resource ${row.resourceId} non-compliant with rule ${row.configRuleName}`,
      severity: severityFor(row.configRuleName),
      status: 'open',
      resourceId: row.resourceId,
      resourceType: row.resourceType,
      mappedControlCodes: ruleToControls.get(row.configRuleName) ?? [],
      vendorCheckId: row.configRuleName,
      detectedAt: row.resultRecordedTime,
      evidence: {
        text: row.annotation,
        json: { ruleName: row.configRuleName, resultRecordedTime: row.resultRecordedTime },
      },
    });
  }
}

registerCcmConnector('aws-config', () => new AwsConfigConnector());
