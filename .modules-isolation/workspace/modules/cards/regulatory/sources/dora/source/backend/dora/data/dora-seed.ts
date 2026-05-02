import { safeQuery, tenantSchema } from '../ports/database.port';

export function getDoraSchemaStatements(schema: string): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS "${schema}".dora_ict_assets (
      asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      criticality TEXT NOT NULL DEFAULT 'medium',
      vendor TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "${schema}".dora_resilience_tests (
      test_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      test_type TEXT NOT NULL,
      scope TEXT NOT NULL,
      scheduled_date TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      result TEXT,
      status TEXT NOT NULL DEFAULT 'planned',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "${schema}".dora_major_incidents (
      incident_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      classification TEXT NOT NULL DEFAULT 'unclassified',
      reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ,
      root_cause TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS "${schema}".dora_threat_intel (
      intel_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source TEXT NOT NULL,
      threat_type TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      description TEXT,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      acknowledged BOOLEAN NOT NULL DEFAULT FALSE
    )`,
    `CREATE TABLE IF NOT EXISTS "${schema}".dora_backup_configs (
      config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_id UUID REFERENCES "${schema}".dora_ict_assets(asset_id),
      backup_type TEXT NOT NULL DEFAULT 'full',
      frequency TEXT NOT NULL DEFAULT 'daily',
      retention_days INTEGER NOT NULL DEFAULT 30,
      last_tested_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  ];
}

export async function seedDoraModule(tenantId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  for (const stmt of getDoraSchemaStatements(schema)) {
    await safeQuery(stmt);
  }
}

export function getDoraSeedData(): Record<string, any[]> {
  return {
    dora_ict_assets: [],
    dora_resilience_tests: [],
    dora_major_incidents: [],
    dora_threat_intel: [],
    dora_backup_configs: [],
  };
}
