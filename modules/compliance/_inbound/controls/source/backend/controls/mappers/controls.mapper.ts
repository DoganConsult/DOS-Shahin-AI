import type { GenericRow } from '@dos/types';

export type AudienceLevel = 'public' | 'internal' | 'admin' | 'ai_agent' | 'export';

const SENSITIVE_FIELDS: readonly string[] = ['automation_config', 'deficiency_detail'];
const INTERNAL_ONLY_FIELDS: readonly string[] = ['deleted_at', 'internal_notes', 'system_flags', 'ai_metadata'];
const ADMIN_ONLY_FIELDS: readonly string[] = ['tenant_id', 'deleted_at', 'internal_notes', 'system_flags'];

export function toEntity(row: GenericRow) {
  return {
    control_id: row.control_id ?? row.id,
    tenant_id: row.tenant_id,
    ...row,
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at,
    last_tested_at: row.last_tested_at?.toISOString?.() ?? row.last_tested_at,
    next_test_due_at: row.next_test_due_at?.toISOString?.() ?? row.next_test_due_at,
    created_by: row.created_by ?? 'system',
  };
}

export function toEntityList(rows: GenericRow[]) {
  return rows.map(toEntity);
}

export function toCreateInput(dto: Record<string, unknown>, tenantId: string, userId: string) {
  return {
    ...dto,
    tenant_id: tenantId,
    created_by: userId,
    status: dto.status || 'draft',
    effectiveness_rating: dto.effectiveness_rating || 'not_assessed',
  };
}

export function toApiResponse(entity: Record<string, unknown>): Record<string, unknown> {
  const { deleted_at: _deleted_at, ...rest } = entity;
  return rest;
}

export function toApiListResponse(entities: Record<string, unknown>[], total: number) {
  return { data: entities.map(toApiResponse), total };
}

export function toAudienceShaped(entity: Record<string, unknown>, audience: AudienceLevel): Record<string, unknown> {
  const result = { ...entity };
  if (audience === 'public' || audience === 'export') {
    for (const f of SENSITIVE_FIELDS) delete result[f];
    for (const f of INTERNAL_ONLY_FIELDS) delete result[f];
  }
  if (audience === 'internal') {
    for (const f of ADMIN_ONLY_FIELDS) delete result[f];
  }
  if (audience === 'export') {
    delete result['deleted_at'];
    result['export_timestamp'] = new Date().toISOString();
  }
  return result;
}

export function toAdminResponse(entity: Record<string, unknown>): Record<string, unknown> {
  return { ...entity };
}

export function toListItem(entity: Record<string, unknown>): Record<string, unknown> {
  const { deleted_at: _deleted_at, internal_notes: _internal_notes, system_flags: _system_flags, ai_metadata: _ai_metadata, automation_config: _automation_config, ...rest } = entity;
  return rest;
}

export function redactForAudit(entity: Record<string, unknown>): Record<string, unknown> {
  const result = { ...entity };
  for (const f of SENSITIVE_FIELDS) {
    if (f in result) result[f] = '[REDACTED]';
  }
  return result;
}

export function stripFieldsForExport(entity: Record<string, unknown>, excludeFields?: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entity)) {
    if (key === 'deleted_at') continue;
    if (excludeFields?.includes(key)) continue;
    result[key] = value;
  }
  result['export_timestamp'] = new Date().toISOString();
  return result;
}

export function toImportEntity(row: Record<string, unknown>, tenantId: string, userId: string): Record<string, unknown> {
  return {
    ...row,
    tenant_id: tenantId,
    created_by: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: row.status || 'draft',
    effectiveness_rating: row.effectiveness_rating || 'not_assessed',
  };
}

export function toEffectivenessRecord(row: GenericRow) {
  return {
    test_id: row.test_id ?? row.id,
    control_id: row.control_id,
    test_type: row.test_type,
    test_result: row.test_result,
    rating: row.rating,
    tested_by: row.tested_by,
    tested_at: row.tested_at?.toISOString?.() ?? row.tested_at,
    sample_size: row.sample_size,
    exceptions_found: row.exceptions_found,
    findings: row.findings,
    evidence_ids: row.evidence_ids,
  };
}

export function toMappingRecord(row: GenericRow) {
  return {
    control_id: row.control_id,
    mapped_entity_type: row.mapped_entity_type,
    mapped_entity_id: row.mapped_entity_id,
    link_type: row.link_type,
    linked_at: row.linked_at?.toISOString?.() ?? row.linked_at,
    linked_by: row.linked_by,
  };
}
