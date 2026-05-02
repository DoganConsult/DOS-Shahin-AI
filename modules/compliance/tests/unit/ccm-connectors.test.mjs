/**
 * Wave 14+15 — unit tests for CCM connector pure helpers.
 * Doesn't require vendor SDKs; tests normalization logic.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { AwsConfigConnector } = require('../../dist/infrastructure/integrations/ccm/aws-config.connector.js');
const { AzurePolicyConnector } = require('../../dist/infrastructure/integrations/ccm/azure-policy.connector.js');
const { GcpAssetInventoryConnector } = require('../../dist/infrastructure/integrations/ccm/gcp-asset.connector.js');
const { OktaScimConnector } = require('../../dist/infrastructure/integrations/ccm/okta-scim.connector.js');
const { GithubConnector } = require('../../dist/infrastructure/integrations/ccm/github.connector.js');
const { listRegisteredCcmConnectors } = require('../../dist/infrastructure/integrations/ccm/connector.contract.js');

test('CCM registry has 5 connectors registered', () => {
  const ids = listRegisteredCcmConnectors();
  assert.ok(ids.includes('aws-config'));
  assert.ok(ids.includes('azure-policy'));
  assert.ok(ids.includes('gcp-asset-inventory'));
  assert.ok(ids.includes('okta-scim'));
  assert.ok(ids.includes('github'));
  assert.ok(ids.length >= 5);
});

test('AWS Config: NON_COMPLIANT row → finding with severity from rule map', () => {
  const ruleMap = new Map([['s3-bucket-public-read-prohibited', ['AC-3', 'SC-7']]]);
  const f = AwsConfigConnector.normalizeRow(
    {
      configRuleName: 's3-bucket-public-read-prohibited',
      resourceType: 'AWS::S3::Bucket',
      resourceId: 'arn:aws:s3:::my-bucket',
      complianceType: 'NON_COMPLIANT',
      annotation: 'Bucket allows public read',
      resultRecordedTime: '2026-04-30T00:00:00Z',
    },
    'tenant-1',
    ruleMap,
  );
  assert.ok(f);
  assert.equal(f.connectorId, 'aws-config');
  assert.equal(f.severity, 'critical');
  assert.deepEqual(f.mappedControlCodes, ['AC-3', 'SC-7']);
  assert.equal(f.tenantId, 'tenant-1');
});

test('AWS Config: COMPLIANT row → null (not a finding)', () => {
  const f = AwsConfigConnector.normalizeRow(
    {
      configRuleName: 's3-bucket-public-read-prohibited',
      resourceType: 'AWS::S3::Bucket',
      resourceId: 'arn:aws:s3:::my-bucket',
      complianceType: 'COMPLIANT',
      resultRecordedTime: '2026-04-30T00:00:00Z',
    },
    'tenant-1',
    new Map(),
  );
  assert.equal(f, null);
});

test('Azure Policy: NonCompliant state → finding', () => {
  const f = AzurePolicyConnector.normalizeState(
    {
      policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/abc',
      policyDefinitionName: 'storage-account-public-access-disabled',
      resourceId: '/subscriptions/x/resourceGroups/y/providers/Microsoft.Storage/storageAccounts/z',
      resourceType: 'Microsoft.Storage/storageAccounts',
      complianceState: 'NonCompliant',
      timestamp: '2026-04-30T00:00:00Z',
    },
    'tenant-1',
    new Map([['storage-account-public-access-disabled', ['SC-7', 'AC-3']]]),
  );
  assert.ok(f);
  assert.equal(f.severity, 'critical');
  assert.deepEqual(f.mappedControlCodes, ['SC-7', 'AC-3']);
});

test('GCP Asset: ACTIVE finding → finding; INACTIVE → null', () => {
  const active = GcpAssetInventoryConnector.normalizeFinding(
    { name: 'organizations/x/findings/abc', category: 'PUBLIC_BUCKET', resourceName: '//storage.googleapis.com/projects/x/buckets/y', state: 'ACTIVE', severity: 'CRITICAL', eventTime: '2026-04-30T00:00:00Z' },
    'tenant-1',
    new Map([['PUBLIC_BUCKET', ['SC-7']]]),
  );
  assert.ok(active);
  assert.equal(active.severity, 'critical');

  const inactive = GcpAssetInventoryConnector.normalizeFinding(
    { name: 'organizations/x/findings/abc', category: 'PUBLIC_BUCKET', resourceName: '//x', state: 'INACTIVE', severity: 'CRITICAL', eventTime: '2026-04-30T00:00:00Z' },
    'tenant-1',
    new Map(),
  );
  assert.equal(inactive, null);
});

test('Okta: detects active users without MFA', () => {
  const findings = OktaScimConnector.usersWithoutMfa(
    [
      { id: 'u1', status: 'ACTIVE', profile: { login: 'alice@x.com', email: 'alice@x.com' }, mfa: { factors: [{ factorType: 'sms', status: 'ACTIVE' }] } },
      { id: 'u2', status: 'ACTIVE', profile: { login: 'bob@x.com', email: 'bob@x.com' } },
      { id: 'u3', status: 'DEPROVISIONED', profile: { login: 'carol@x.com', email: 'carol@x.com' } },
      { id: 'u4', status: 'ACTIVE', profile: { login: 'dave@x.com', email: 'dave@x.com' }, mfa: { factors: [{ factorType: 'webauthn', status: 'PENDING_ACTIVATION' }] } },
    ],
    'tenant-1',
  );
  assert.equal(findings.length, 2);
  assert.ok(findings.some((f) => f.resourceId === 'u2'));
  assert.ok(findings.some((f) => f.resourceId === 'u4'));
  assert.ok(findings[0].mappedControlCodes.includes('IA-2(1)'));
});

test('GitHub: detects multiple posture gaps per repo', () => {
  const findings = GithubConnector.evaluateRepos(
    [
      {
        fullName: 'org/critical-repo',
        defaultBranch: 'main',
        isPrivate: true,
        branchProtection: {
          requirePullRequestReviews: false,
          requireStatusChecks: true,
          enforceAdmins: false,
          requireSignedCommits: false,
          requiredApprovingReviewCount: 0,
        },
        secretScanning: { enabled: false },
        dependabot: { enabled: false, alerts: 0 },
      },
    ],
    'tenant-1',
  );
  // Should flag: no-pr-review, no-secret-scan (private), no-dependabot, no-signed-commits → 4 findings
  assert.equal(findings.length, 4);
  const byCheckId = new Set(findings.map((f) => f.vendorCheckId));
  assert.ok(byCheckId.has('branch-protection-pr-review'));
  assert.ok(byCheckId.has('secret-scanning-required'));
  assert.ok(byCheckId.has('dependabot-required'));
  assert.ok(byCheckId.has('signed-commits-required'));
});
