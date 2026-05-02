import type { ComplianceAssessment, ComplianceAssessmentCreateInput } from '../types/compliance.types';
import type { GenericRow } from '@dos/types';

export function toEntity(row: GenericRow): ComplianceAssessment {
  return {
    assessment_id: row.assessment_id ?? row.id,
    tenant_id: row.tenant_id,
    ...row,
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at,
    created_by: row.created_by ?? 'system',
  } as ComplianceAssessment;
}

export function toEntityList(rows: GenericRow[]): ComplianceAssessment[] {
  return rows.map(toEntity);
}

export function toCreateInput(dto: Record<string, unknown>, tenantId: string, userId: string): ComplianceAssessmentCreateInput {
  return {
    ...dto,
    tenant_id: tenantId,
    created_by: userId,
  } as ComplianceAssessmentCreateInput;
}

export function toApiResponse(entity: ComplianceAssessment): Record<string, unknown> {
  const { deleted_at: _deleted_at, ...rest } = entity;
  return rest;
}

export function toApiListResponse(entities: ComplianceAssessment[], total: number): { data: Record<string, unknown>[]; total: number } {
  return {
    data: entities.map(toApiResponse),
    total,
  };
}


export type AudienceLevel = 'public' | 'internal' | 'admin' | 'ai_agent' | 'export';

const SENSITIVE_FIELDS: readonly string[] = ['internal_notes', 'system_flags'];
const INTERNAL_ONLY_FIELDS: readonly string[] = ['deleted_at', 'internal_notes', 'system_flags', 'ai_metadata'];
const ADMIN_ONLY_FIELDS: readonly string[] = ['tenant_id', 'deleted_at', 'internal_notes', 'system_flags'];

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
  const { deleted_at: _deleted_at, internal_notes: _internal_notes, system_flags: _system_flags, ai_metadata: _ai_metadata, ...rest } = entity;
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
  };
}
