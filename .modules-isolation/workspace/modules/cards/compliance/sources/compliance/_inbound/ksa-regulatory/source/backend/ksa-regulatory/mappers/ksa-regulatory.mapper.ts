import type { GenericRow } from '@dos/types';
import type { RegulatoryObligation, RegulatoryChange, ReadinessSnapshot } from '../types/ksa-regulatory.types';

export function toObligation(row: GenericRow): RegulatoryObligation {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    title: row.title,
    title_ar: row.title_ar,
    description: row.description,
    regulatory_authority: row.regulatory_authority,
    framework_code: row.framework_code,
    due_date: row.due_date?.toISOString?.() ?? row.due_date,
    status: row.status,
    priority: row.priority,
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at,
    created_by: row.created_by ?? 'system',
    deleted_at: row.deleted_at,
  };
}

export function toObligationList(rows: GenericRow[]): RegulatoryObligation[] {
  return rows.map(toObligation);
}

export function toRegulatoryChange(row: GenericRow): RegulatoryChange {
  return {
    id: row.id,
    title: row.title,
    authority: row.authority,
    change_type: row.change_type,
    effective_date: row.effective_date?.toISOString?.() ?? row.effective_date,
    impact_assessment: row.impact_assessment,
    summary: row.summary,
    status: row.status,
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

export function toReadinessSnapshot(row: GenericRow): ReadinessSnapshot {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    snapshot_data: typeof row.snapshot_data === 'string' ? JSON.parse(row.snapshot_data) : row.snapshot_data,
    overall_score: row.overall_score ?? 0,
    scored_at: row.scored_at?.toISOString?.() ?? row.scored_at,
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

export function toObligationApiResponse(entity: RegulatoryObligation): Record<string, unknown> {
  const { deleted_at: _deleted_at, ...rest } = entity;
  return rest;
}

export function redactForAudit(entity: Record<string, unknown>): Record<string, unknown> {
  return { ...entity };
}
