import { safeQuery, tenantSchema } from '../ports/database.port';
import type { GenericRow } from '@dos/types';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

export interface KnowledgeSource {
  sourceId: string;
  nameEn: string;
  nameAr: string | null;
  sourceType: string;
  syncFrequency: string;
  status: string;
  lastSyncAt: string | null;
  documentCount: number;
  totalSizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export async function listSources(tenantId: string): Promise<KnowledgeSource[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT s.*,
            (SELECT COUNT(*)::int FROM "${schema}".local_knowledge_documents d WHERE d.source_id = s.source_id AND d.deleted_at IS NULL) AS document_count,
            (SELECT COALESCE(SUM(d.file_size_bytes), 0)::bigint FROM "${schema}".local_knowledge_documents d WHERE d.source_id = s.source_id AND d.deleted_at IS NULL) AS total_size_bytes
     FROM "${schema}".local_knowledge_sources s
     WHERE s.deleted_at IS NULL
     ORDER BY s.created_at DESC`,
  );
  return rows.map((r: GenericRow) => mapSource(r));
}

export async function getSourceById(tenantId: string, sourceId: string): Promise<KnowledgeSource | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT s.*,
            (SELECT COUNT(*)::int FROM "${schema}".local_knowledge_documents d WHERE d.source_id = s.source_id AND d.deleted_at IS NULL) AS document_count,
            (SELECT COALESCE(SUM(d.file_size_bytes), 0)::bigint FROM "${schema}".local_knowledge_documents d WHERE d.source_id = s.source_id AND d.deleted_at IS NULL) AS total_size_bytes
     FROM "${schema}".local_knowledge_sources s
     WHERE s.source_id = $1 AND s.deleted_at IS NULL LIMIT 1`,
    [sourceId],
  );
  if (!rows.length) return null;
  return mapSource(rows[0] as GenericRow);
}

export async function createSource(tenantId: string, body: { nameEn: string; nameAr?: string; sourceType: string; syncFrequency?: string }, userId?: string): Promise<KnowledgeSource> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".local_knowledge_sources
       (name_en, name_ar, source_type, sync_frequency, status, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'active', $5, NOW(), NOW())
     RETURNING *, 0 AS document_count, 0 AS total_size_bytes`,
    [body.nameEn, body.nameAr ?? null, body.sourceType, body.syncFrequency ?? 'manual', userId ?? SYSTEM_JOB_ACTOR],
  );
  return mapSource(rows[0] as GenericRow);
}

function mapSource(r: GenericRow): KnowledgeSource {
  return {
    sourceId: r.source_id as string,
    nameEn: r.name_en as string,
    nameAr: (r.name_ar as string) ?? null,
    sourceType: r.source_type as string,
    syncFrequency: r.sync_frequency as string,
    status: r.status as string,
    lastSyncAt: r.last_sync_at ? String(r.last_sync_at) : null,
    documentCount: Number(r.document_count ?? 0),
    totalSizeBytes: Number(r.total_size_bytes ?? 0),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}
