import type { GenericRow } from '@dos/types';

export interface DoraIctAsset { id: string; name: string; criticality: string; asset_type: string; status: string; owner?: string; created_at: string; }
export interface DoraResilienceTest { id: string; test_name: string; test_type: string; status: string; scheduled_date?: string; completed_date?: string; result?: string; created_at: string; }
export interface DoraMajorIncident { id: string; title: string; severity: string; status: string; reported_at: string; resolved_at?: string; }
export interface DoraObligation { id: string; title: string; pillar: string; status: string; due_date?: string; created_at: string; }

export function toIctAsset(row: GenericRow): DoraIctAsset {
  return { id: row.id, name: row.name, criticality: row.criticality, asset_type: row.asset_type, status: row.status, owner: row.owner, created_at: row.created_at?.toISOString?.() ?? row.created_at };
}

export function toResilienceTest(row: GenericRow): DoraResilienceTest {
  return { id: row.id, test_name: row.test_name, test_type: row.test_type, status: row.status, scheduled_date: row.scheduled_date, completed_date: row.completed_date, result: row.result, created_at: row.created_at?.toISOString?.() ?? row.created_at };
}

export function toMajorIncident(row: GenericRow): DoraMajorIncident {
  return { id: row.id, title: row.title, severity: row.severity, status: row.status, reported_at: row.reported_at?.toISOString?.() ?? row.reported_at, resolved_at: row.resolved_at?.toISOString?.() ?? row.resolved_at };
}

export function toObligation(row: GenericRow): DoraObligation {
  return { id: row.id, title: row.title, pillar: row.pillar, status: row.status, due_date: row.due_date, created_at: row.created_at?.toISOString?.() ?? row.created_at };
}
