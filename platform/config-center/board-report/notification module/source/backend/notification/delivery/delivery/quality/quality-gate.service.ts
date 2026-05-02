import { safeQuery } from '@dos/db';
import { publish } from '@dos/platform-core/events';
import { v4 as uuid } from 'uuid';
import type { QualityGate, QualityGateStatus } from '../contracts/delivery.types';

export async function registerQualityGate(input: {
  releaseId: string;
  gateCode: string;
  category: QualityGate['category'];
  owner: string;
  passThreshold?: number;
}): Promise<QualityGate> {
  const gateId = uuid();
  const now = new Date().toISOString();
  await safeQuery(
    `INSERT INTO public.dos_quality_gates (
      gate_id, gate_code, release_id, category, status,
      owner, pass_threshold, actual_value, notes, evaluated_at, created_at
    ) VALUES ($1,$2,$3,$4,'pending',$5,$6,NULL,NULL,NULL,$7)`,
    [gateId, input.gateCode, input.releaseId, input.category, input.owner, input.passThreshold ?? null, now],
  );
  return getQualityGate(gateId) as Promise<QualityGate>;
}

export async function evaluateQualityGate(
  gateId: string,
  status: QualityGateStatus,
  actualValue?: number,
  notes?: string,
): Promise<QualityGate | null> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_quality_gates
     SET status = $1, actual_value = $2, notes = $3, evaluated_at = $4
     WHERE gate_id = $5`,
    [status, actualValue ?? null, notes ?? null, now, gateId],
  );
  const gate = await getQualityGate(gateId);
  if (gate) {
    await publish('delivery.quality_gate.evaluated', 'platform', {
      gateId,
      gateCode: gate.gateCode,
      releaseId: gate.releaseId,
      status,
      actualValue,
    }, {});
  }
  return gate;
}

export async function getQualityGate(gateId: string): Promise<QualityGate | null> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_quality_gates WHERE gate_id = $1 LIMIT 1`,
    [gateId],
  );
  if (!result.rows[0]) return null;
  return mapGateRow(result.rows[0]);
}

export async function listQualityGatesByRelease(releaseId: string): Promise<QualityGate[]> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_quality_gates WHERE release_id = $1 ORDER BY created_at`,
    [releaseId],
  );
  return result.rows.map(mapGateRow);
}

export async function listFailingGates(releaseId: string): Promise<QualityGate[]> {
  const result = await safeQuery(
    `SELECT * FROM public.dos_quality_gates WHERE release_id = $1 AND status = 'failing' ORDER BY created_at`,
    [releaseId],
  );
  return result.rows.map(mapGateRow);
}

export async function isReleaseQualityApproved(releaseId: string): Promise<{ approved: boolean; failingGates: QualityGate[]; pendingGates: QualityGate[] }> {
  const gates = await listQualityGatesByRelease(releaseId);
  const failing = gates.filter((g) => g.status === 'failing');
  const pending = gates.filter((g) => g.status === 'pending');
  return {
    approved: failing.length === 0 && pending.length === 0 && gates.length > 0,
    failingGates: failing,
    pendingGates: pending,
  };
}

export async function skipQualityGate(gateId: string, reason: string): Promise<void> {
  const now = new Date().toISOString();
  await safeQuery(
    `UPDATE public.dos_quality_gates SET status = 'skipped', notes = $1, evaluated_at = $2 WHERE gate_id = $3`,
    [reason, now, gateId],
  );
}

function mapGateRow(row: Record<string, any>): QualityGate {
  return {
    gateId: row.gate_id as string,
    gateCode: row.gate_code as string,
    releaseId: row.release_id as string,
    category: row.category as QualityGate['category'],
    status: row.status as QualityGateStatus,
    owner: row.owner as string,
    passThreshold: (row.pass_threshold as number) ?? null,
    actualValue: (row.actual_value as number) ?? null,
    notes: (row.notes as string) ?? null,
    evaluatedAt: (row.evaluated_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}
