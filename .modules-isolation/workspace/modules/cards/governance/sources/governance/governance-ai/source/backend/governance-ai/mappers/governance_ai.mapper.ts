import type { GenericRow } from '@dos/types';

export type AudienceLevel = 'public' | 'internal' | 'admin' | 'ai_agent' | 'export';

const SENSITIVE_FIELDS: readonly string[] = ['model_configuration', 'training_data_reference'];
const INTERNAL_ONLY_FIELDS: readonly string[] = ['deleted_at', 'internal_notes', 'system_flags'];
const ADMIN_ONLY_FIELDS: readonly string[] = ['tenant_id', 'deleted_at', 'internal_notes', 'system_flags'];

export function toSignalEntity(row: GenericRow) {
  return {
    signal_id: row.signal_id ?? row.id,
    tenant_id: row.tenant_id,
    ...row,
    detected_at: row.detected_at?.toISOString?.() ?? row.detected_at,
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

export function toSignalList(rows: GenericRow[]) {
  return rows.map(toSignalEntity);
}

export function toInterpretationEntity(row: GenericRow) {
  return {
    interpretation_id: row.interpretation_id ?? row.id,
    signal_id: row.signal_id,
    summary: row.summary,
    explanation: row.explanation,
    impact_assessment: row.impact_assessment,
    affected_domains: row.affected_domains,
    suggested_actions: row.suggested_actions,
    confidence_score: row.confidence_score,
    interpreted_at: row.interpreted_at?.toISOString?.() ?? row.interpreted_at,
    interpreted_by: row.interpreted_by,
    human_review_required: row.human_review_required,
    human_override: row.human_override,
  };
}

export function toNarrativeEntity(row: GenericRow) {
  return {
    narrative_id: row.narrative_id ?? row.id,
    signal_id: row.signal_id,
    narrative_type: row.narrative_type,
    content: row.content,
    target_audience: row.target_audience,
    generated_at: row.generated_at?.toISOString?.() ?? row.generated_at,
    approved: row.approved,
    approved_by: row.approved_by,
    approved_at: row.approved_at?.toISOString?.() ?? row.approved_at,
    version: row.version,
  };
}

export function toModelEntity(row: GenericRow) {
  return {
    model_id: row.model_id ?? row.id,
    tenant_id: row.tenant_id,
    model_name: row.model_name,
    model_type: row.model_type,
    version: row.version,
    status: row.status,
    accuracy: row.accuracy,
    last_trained_at: row.last_trained_at?.toISOString?.() ?? row.last_trained_at,
    data_source_modules: row.data_source_modules,
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

export function redactForAudit(entity: Record<string, unknown>): Record<string, unknown> {
  const result = { ...entity };
  for (const f of SENSITIVE_FIELDS) {
    if (f in result) result[f] = '[REDACTED]';
  }
  return result;
}

export function toListItem(entity: Record<string, unknown>): Record<string, unknown> {
  const { deleted_at: _deleted_at, internal_notes: _internal_notes, system_flags: _system_flags, model_configuration: _model_configuration, training_data_reference: _training_data_reference, ...rest } = entity;
  return rest;
}
