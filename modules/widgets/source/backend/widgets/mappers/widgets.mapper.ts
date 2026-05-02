import type { GenericRow } from '@dos/types';

export interface WidgetsMappedEntity {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export function toEntity(row: GenericRow): WidgetsMappedEntity {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    createdBy: row.created_by ?? 'system',
    updatedBy: row.updated_by,
  };
}

export function toEntityList(rows: GenericRow[]): WidgetsMappedEntity[] {
  return rows.map(toEntity);
}

export function toApiResponse(entity: WidgetsMappedEntity): Record<string, unknown> {
  return { ...entity };
}

export function toApiListResponse(entities: WidgetsMappedEntity[], total: number): { data: Record<string, unknown>[]; total: number } {
  return { data: entities.map(toApiResponse), total };
}

export type AudienceLevel = 'public' | 'internal' | 'admin' | 'ai_agent' | 'export';

const SENSITIVE_FIELDS: readonly string[] = ['internal_notes', 'system_flags'];
const INTERNAL_ONLY_FIELDS: readonly string[] = ['internal_notes', 'system_flags', 'ai_metadata'];

export function toAudienceShaped(entity: Record<string, unknown>, audience: AudienceLevel): Record<string, unknown> {
  const result = { ...entity };
  if (audience === 'public' || audience === 'export') {
    for (const f of SENSITIVE_FIELDS) delete result[f];
    for (const f of INTERNAL_ONLY_FIELDS) delete result[f];
  }
  if (audience === 'export') {
    result['export_timestamp'] = new Date().toISOString();
  }
  return result;
}

export function redactForAudit(entity: Record<string, unknown>): Record<string, unknown> {
  const result = { ...entity };
  for (const f of SENSITIVE_FIELDS) {
    if (f in result) result[f] = '[REDACTED]';
  }
  return result;
}
