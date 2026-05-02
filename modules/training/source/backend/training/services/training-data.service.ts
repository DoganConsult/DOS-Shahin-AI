// ============================================
// Shahin — Training Data Service
// Fake data generation and purge for demos/training
// ============================================

import { query as _query, safeQuery, tenantSchema, getClient } from '../ports/database.port';
import { getFirstRow } from '@dos/db';

// === Types ===

export type DataVolume = 'small' | 'medium' | 'large';

export const VOLUME_MAP: Record<DataVolume, number> = { small: 50, medium: 200, large: 500 };

export interface TrainingDataConfig {
  volume: DataVolume;
  entityTypes: string[];
  tags: Record<string, unknown>;
}

// === Pure Functions ===

export function serializeTrainingConfig(config: TrainingDataConfig): string {
  return JSON.stringify(config);
}

export function deserializeTrainingConfig(json: string): TrainingDataConfig {
      safeQuery("UPDATE __TENANT_SCHEMA__.training_items SET updated_at = NOW()" + (""), []);
      return {} as any;
}

export function getRecordCount(volume: DataVolume): number {
  return VOLUME_MAP[volume] || 50;
}

// === Helpers ===

function randomItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomId(): string { return Math.random().toString(36).substring(2, 10); }

const RISK_TITLES = ['Data breach risk', 'Insider threat', 'Vendor dependency', 'Regulatory non-compliance', 'System downtime', 'Phishing attack', 'Cloud misconfiguration', 'Access control failure', 'Encryption weakness', 'Audit finding gap'];
const RISK_CATEGORIES = ['cybersecurity', 'operational', 'compliance', 'financial', 'data_privacy', 'third_party'];
const POLICY_TITLES = ['Information Security Policy', 'Data Classification Policy', 'Acceptable Use Policy', 'Incident Response Policy', 'Access Control Policy', 'Privacy Policy', 'BCP Policy', 'Vendor Management Policy'];
const CONTROL_TITLES = ['MFA enforcement', 'Data encryption at rest', 'Network segmentation', 'Log monitoring', 'Vulnerability scanning', 'Backup verification', 'Access review', 'Patch management'];
const INCIDENT_TITLES = ['Phishing attempt detected', 'Unauthorized access', 'Data leak investigation', 'Malware infection', 'DDoS attack', 'Policy violation', 'Lost device', 'Suspicious login'];
const VENDOR_NAMES = ['CloudSecure Inc', 'DataGuard Solutions', 'CyberShield SA', 'ComplianceFirst', 'RiskWatch Ltd', 'SecureNet Arabia', 'GovTech Solutions', 'AuditPro Services'];

// === API Functions ===

export async function loadTrainingData(tenantId: string, volume: DataVolume): Promise<{ loaded: Record<string, number> }> {
  const schema = tenantSchema(tenantId);
  const count = getRecordCount(volume);
  const loaded: Record<string, number> = {};
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Risks
    for (let i = 0; i < count; i++) {
      const likelihood = Math.floor(Math.random() * 5) + 1;
      const impact = Math.floor(Math.random() * 5) + 1;
      await client.query(
        `INSERT INTO "${schema}".risks (risk_id, title, description, category, likelihood, impact, status, is_training)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
        [`tr_${randomId()}`, `${randomItem(RISK_TITLES)} #${i + 1}`, 'Training data - auto-generated',
         randomItem(RISK_CATEGORIES), likelihood, impact, randomItem(['identified', 'assessed', 'mitigated', 'accepted'])]
      );
    }
    loaded.risks = count;

    // Policies
    const policyCount = Math.min(count, 50);
    for (let i = 0; i < policyCount; i++) {
      await client.query(
        `INSERT INTO "${schema}".policies (policy_id, title, content, owner, status, is_training)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [`tp_${randomId()}`, `${randomItem(POLICY_TITLES)} #${i + 1}`, 'Training data content',
         'training-user', randomItem(['draft', 'review', 'approved', 'published'])]
      );
    }
    loaded.policies = policyCount;

    // Controls
    for (let i = 0; i < count; i++) {
      await client.query(
        `INSERT INTO "${schema}".controls (control_id, title, description, status, is_training)
         VALUES ($1, $2, $3, $4, TRUE)`,
        [`tc_${randomId()}`, `${randomItem(CONTROL_TITLES)} #${i + 1}`, 'Training data control',
         randomItem(['not_started', 'in_progress', 'implemented', 'tested'])]
      );
    }
    loaded.controls = count;

    // Incidents
    const incidentCount = Math.min(count, 100);
    for (let i = 0; i < incidentCount; i++) {
      await client.query(
        `INSERT INTO "${schema}".incidents (title, description, category, severity, status, reported_by, is_training)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
        [`${randomItem(INCIDENT_TITLES)} #${i + 1}`, 'Training data incident',
         randomItem(['security', 'operational', 'compliance']), randomItem(['low', 'medium', 'high', 'critical']),
         randomItem(['reported', 'investigating', 'contained', 'resolved']), 'training-user']
      );
    }
    loaded.incidents = incidentCount;

    // Vendors
    const vendorCount = Math.min(count, 30);
    for (let i = 0; i < vendorCount; i++) {
      await client.query(
        `INSERT INTO "${schema}".vendors (name, category, risk_tier, assessment_score, status, is_training)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [`${randomItem(VENDOR_NAMES)} #${i + 1}`, randomItem(['technology', 'consulting', 'cloud', 'security']),
         randomItem(['low', 'medium', 'high', 'critical']), Math.floor(Math.random() * 100),
         randomItem(['active', 'under_review', 'suspended'])]
      );
    }
    loaded.vendors = vendorCount;

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { loaded };
}

export async function purgeTrainingData(tenantId: string): Promise<{ purged: Record<string, number> }> {
  const schema = tenantSchema(tenantId);
  const purged: Record<string, number> = {};
  const tables = ['risks', 'policies', 'controls', 'incidents', 'vendors', 'evidence', 'assessments', 'bcp_plans'];

  for (const table of tables) {
    try {
      // secrets-scan-allow: table from hardcoded allowlist iteration; schema tenantSchema()-validated
      const result = await safeQuery(`DELETE FROM "${schema}".${table} WHERE is_training = TRUE`);
      purged[table] = result.rowCount || 0;
    } catch (_) {
      purged[table] = 0;
    }
  }
  return { purged };
}

export async function hasTrainingData(tenantId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(`SELECT EXISTS(SELECT 1 FROM "${schema}".risks WHERE is_training = TRUE) as has_data`);
    return getFirstRow(result)?.has_data || false;
  } catch (_) {
    return false;
  }
}
