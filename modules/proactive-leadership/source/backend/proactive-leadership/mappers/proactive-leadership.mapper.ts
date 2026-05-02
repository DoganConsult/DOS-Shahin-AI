import type { GenericRow } from '@dos/types';
import type { LeadershipInsight, LeadershipAlert } from '../types/proactive-leadership.types';

export function toInsight(row: GenericRow): LeadershipInsight {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    insight_type: row.insight_type,
    title: row.title,
    summary: row.summary,
    severity: row.severity,
    data: typeof row.data === 'string' ? JSON.parse(row.data) : (row.data ?? {}),
    ai_generated: row.ai_generated ?? false,
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    deleted_at: row.deleted_at,
  };
}

export function toInsightList(rows: GenericRow[]): LeadershipInsight[] {
  return rows.map(toInsight);
}

export function toAlert(row: GenericRow): LeadershipAlert {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    alert_type: row.alert_type,
    title: row.title,
    message: row.message,
    severity: row.severity,
    acknowledged: row.acknowledged ?? false,
    acknowledged_by: row.acknowledged_by,
    acknowledged_at: row.acknowledged_at?.toISOString?.() ?? row.acknowledged_at,
    triggered_at: row.triggered_at?.toISOString?.() ?? row.triggered_at,
    deleted_at: row.deleted_at,
  };
}

export function toAlertList(rows: GenericRow[]): LeadershipAlert[] {
  return rows.map(toAlert);
}

export function toInsightApiResponse(entity: LeadershipInsight): Record<string, unknown> {
  const { deleted_at: _deleted_at, ...rest } = entity;
  return rest;
}
