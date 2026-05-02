import { safeQuery, tenantSchema } from '../ports/database.port';
import type { GenericRow } from '@dos/types';

export interface KnowledgeAdminConfig {
  embeddingModel: string;
  chunkSizeTokens: number;
  chunkOverlapTokens: number;
  maxDocumentSizeMb: number;
  allowedMimeTypes: string[];
  autoEmbedOnIngest: boolean;
  retentionDays: number;
  searchResultLimit: number;
}

const DEFAULT_CONFIG: KnowledgeAdminConfig = {
  embeddingModel: 'text-embedding-3-small',
  chunkSizeTokens: 512,
  chunkOverlapTokens: 50,
  maxDocumentSizeMb: 50,
  allowedMimeTypes: ['application/pdf', 'text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  autoEmbedOnIngest: true,
  retentionDays: 365,
  searchResultLimit: 20,
};

export async function getConfig(tenantId: string): Promise<KnowledgeAdminConfig> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT config_value FROM "${schema}".module_configs WHERE module_code = 'local-knowledge' AND config_key = 'admin_settings' LIMIT 1`,
  ).catch(() => ({ rows: [] }));

  if (!rows.length) return { ...DEFAULT_CONFIG };

  try {
    const stored = JSON.parse((rows[0] as GenericRow).config_value as string);
    return { ...DEFAULT_CONFIG, ...stored };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function updateConfig(tenantId: string, body: Partial<KnowledgeAdminConfig>): Promise<KnowledgeAdminConfig> {
  const schema = tenantSchema(tenantId);
  const current = await getConfig(tenantId);
  const updated = { ...current, ...body };

  await safeQuery(
    `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, updated_at)
     VALUES ('local-knowledge', 'admin_settings', $1, NOW())
     ON CONFLICT (module_code, config_key) DO UPDATE SET config_value = $1, updated_at = NOW()`,
    [JSON.stringify(updated)],
  ).catch(() => {
    return safeQuery(
      `CREATE TABLE IF NOT EXISTS "${schema}".module_configs (
         module_code TEXT NOT NULL, config_key TEXT NOT NULL, config_value TEXT, updated_at TIMESTAMPTZ DEFAULT NOW(),
         PRIMARY KEY (module_code, config_key))`,
    ).then(() =>
      safeQuery(
        `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, updated_at) VALUES ('local-knowledge', 'admin_settings', $1, NOW())`,
        [JSON.stringify(updated)],
      ),
    );
  });

  return updated;
}
