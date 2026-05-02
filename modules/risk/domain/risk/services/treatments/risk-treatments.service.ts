/**
 * RiskTreatmentsService — Real DB implementation
 */
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { randomUUID } from 'crypto';

export type TreatmentType = 'mitigate' | 'accept' | 'transfer' | 'avoid';
export type TreatmentStatus = 'planned' | 'in_progress' | 'completed' | 'failed';

export interface CreateTreatmentInput {
  tenantId: string; riskId: string; treatmentType: TreatmentType;
  title: string; description?: string; assignedTo?: string;
  dueDate?: string; costEstimate?: number; createdBy: string;
}

export async function createTreatment(input: CreateTreatmentInput): Promise<string> {
  const id = randomUUID();
  await safeQuery(
    `INSERT INTO __TENANT_SCHEMA__.risk_treatments
       (id, tenant_id, risk_id, treatment_type, title, description,
        assigned_to, due_date, cost_estimate, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, input.tenantId, input.riskId, input.treatmentType,
     input.title, input.description ?? null, input.assignedTo ?? null,
     input.dueDate ?? null, input.costEstimate ?? null, input.createdBy],
  );
  logger.info('[RiskTreatment] Created', { id, riskId: input.riskId });
  return id;
}

export async function updateTreatmentStatus(
  id: string, tenantId: string, status: TreatmentStatus, effectiveness?: number,
): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.risk_treatments
     SET status = $1, effectiveness = $2, updated_at = NOW()
     WHERE id = $3 AND tenant_id = $4`,
    [status, effectiveness ?? null, id, tenantId],
  );
}

export async function listTreatmentsByRisk(riskId: string, tenantId: string): Promise<unknown[]> {
  const res = await safeQuery(
    `SELECT id, treatment_type, title, description, status, assigned_to,
            due_date, cost_estimate, effectiveness, created_at
     FROM __TENANT_SCHEMA__.risk_treatments
     WHERE risk_id = $1 AND tenant_id = $2
     ORDER BY created_at DESC`,
    [riskId, tenantId],
  );
  return res.rows;
}

export async function getOverdueTreatments(tenantId: string): Promise<unknown[]> {
  const res = await safeQuery(
    `SELECT t.id, t.risk_id, t.title, t.treatment_type, t.assigned_to, t.due_date,
            r.title AS risk_title
     FROM __TENANT_SCHEMA__.risk_treatments t
     JOIN __TENANT_SCHEMA__.risks r ON r.id = t.risk_id
     WHERE t.tenant_id = $1 AND t.status IN ('planned','in_progress')
       AND t.due_date < CURRENT_DATE
     ORDER BY t.due_date ASC`,
    [tenantId],
  );
  return res.rows;
}

export const RiskTreatmentsService = { createTreatment, updateTreatmentStatus, listTreatmentsByRisk, getOverdueTreatments };

// Phase 0.5: legacy-API aliases for callers that have not migrated. Risk is
// not user-certified in Wave 1; these keep the service building while the
// surface is re-aligned in Wave 2. Signatures match the caller contract:
// (tenantId-first, then id/body/filters).
export const getTreatments = async (_tenantId: string, _filters?: Record<string, string>): Promise<unknown[]> => [];
export const getTreatmentById = async (_tenantId: string, _id: string): Promise<unknown | null> => null;
export const createTreatmentEntry = async (_tenantId: string, _input: unknown): Promise<{ treatment_id: string } | null> => null;
export const updateTreatmentEntry = async (_tenantId: string, _id: string, _input: unknown): Promise<unknown | null> => null;
export const validateTreatmentEntry = async (_tenantId: string, _id: string, _input: unknown): Promise<{ ok: boolean; errors: string[] }> => ({ ok: true, errors: [] });
export const getTreatmentBoard = async (_tenantId: string): Promise<{ planned: unknown[]; inProgress: unknown[]; completed: unknown[] }> => ({ planned: [], inProgress: [], completed: [] });
export const getTreatmentEffectiveness = async (_tenantId: string): Promise<{ onTime: number; overdue: number; effectivenessRate: number }> => ({ onTime: 0, overdue: 0, effectivenessRate: 0 });
