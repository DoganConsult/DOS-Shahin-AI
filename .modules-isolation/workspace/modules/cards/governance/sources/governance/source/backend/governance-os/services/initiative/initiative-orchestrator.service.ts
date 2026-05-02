import { safeQuery, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '@dos/types';

export interface OrchestratorRun {
  id: string;
  tenantId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  initiativesTriggered: number;
}

export async function runOrchestrator(tenantId: string): Promise<OrchestratorRun> {
  const schema = tenantSchema(tenantId);
  const id = crypto.randomUUID?.() ?? `run-${Date.now()}`;
  await safeQuery(
    `INSERT INTO "${schema}".governance_os_orchestrator_runs (id, status, started_at, initiatives_triggered)
     VALUES ($1, 'completed', NOW(), 0)`,
    [id],
  );
  return { id, tenantId, status: 'completed', startedAt: new Date().toISOString(), initiativesTriggered: 0 };
}

export async function runInitiative(_tenantId: string, _initiativeCode: string): Promise<{ success: boolean }> {
  return { success: true };
}

export async function getRecentRuns(tenantId: string, limit = 10): Promise<OrchestratorRun[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT id, status, started_at, completed_at, initiatives_triggered
     FROM "${schema}".governance_os_orchestrator_runs ORDER BY started_at DESC LIMIT $1`,
    [limit],
  );
  return rows.map((r: GenericRow) => ({
    id: r.id, tenantId, status: r.status,
    startedAt: r.started_at, completedAt: r.completed_at,
    initiativesTriggered: r.initiatives_triggered ?? 0,
  }));
}

export async function getActiveRuns(tenantId: string): Promise<OrchestratorRun[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT id, status, started_at, completed_at, initiatives_triggered
     FROM "${schema}".governance_os_orchestrator_runs WHERE status = 'running' ORDER BY started_at DESC`,
  );
  return rows.map((r: GenericRow) => ({
    id: r.id, tenantId, status: r.status,
    startedAt: r.started_at, completedAt: r.completed_at,
    initiativesTriggered: r.initiatives_triggered ?? 0,
  }));
}

export function getAutonomyLabels(): Record<string, string> {
  return {
    full: 'Fully autonomous',
    guided: 'AI-guided, human-approved',
    manual: 'Manual with AI recommendations',
  };
}
