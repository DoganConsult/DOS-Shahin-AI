import { masterQuery } from '@dos/db/master';

const RING_CODES = ['R0', 'R1', 'R2', 'R3', 'R4', 'R5'] as const;
export type RingCode = (typeof RING_CODES)[number];

async function actor(): Promise<void> {
  await masterQuery(`SET dos.actor = 'dos-master'`);
}

export interface RolloutPlanRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
  created_by: string;
}

export async function createPlan(title: string, createdBy: string, changeRequestId?: string | null): Promise<RolloutPlanRow> {
  await actor();
  const r = await masterQuery(
    `INSERT INTO dos.rollout_plan (title, status, created_by, change_request_id)
     VALUES ($1,'draft',$2,$3::uuid) RETURNING id, title, status, created_at, created_by`,
    [title, createdBy, changeRequestId ?? null],
  );
  return r.rows[0] as unknown as RolloutPlanRow;
}

export async function listPlans(): Promise<RolloutPlanRow[]> {
  const r = await masterQuery(
    `SELECT id, title, status, created_at, created_by
       FROM dos.rollout_plan ORDER BY created_at DESC LIMIT 100`,
  );
  return r.rows as unknown as RolloutPlanRow[];
}

export async function planComposition(planId: string) {
  const plan = await masterQuery(
    `SELECT id, title, status, created_at, created_by FROM dos.rollout_plan WHERE id=$1::uuid`,
    [planId],
  );
  if (!plan.rows.length) throw new Error('plan_not_found');
  const rings = await masterQuery(
    `SELECT id, ring_code, ring_order, status, started_at, ended_at
       FROM dos.rollout_ring WHERE plan_id=$1::uuid ORDER BY ring_order`,
    [planId],
  );
  const ringIds = (rings.rows as Array<{ id: string }>).map((r) => r.id);
  const cohorts = ringIds.length
    ? await masterQuery(
        `SELECT ring_id, selector_kind, selector_value, weight FROM dos.rollout_cohort
          WHERE ring_id = ANY($1::uuid[])`,
        [ringIds],
      )
    : { rows: [] as unknown[] };
  const gates = ringIds.length
    ? await masterQuery(
        `SELECT ring_id, gate_kind, threshold, comparator, window_sec FROM dos.rollout_health_gate
          WHERE ring_id = ANY($1::uuid[])`,
        [ringIds],
      )
    : { rows: [] as unknown[] };
  return {
    plan: plan.rows[0],
    rings: rings.rows,
    cohorts: cohorts.rows,
    gates: gates.rows,
  };
}

async function findRing(planId: string, ringCode: RingCode) {
  const r = await masterQuery(
    `SELECT id, ring_order, status FROM dos.rollout_ring WHERE plan_id=$1::uuid AND ring_code=$2`,
    [planId, ringCode],
  );
  if (!r.rows.length) throw new Error('ring_not_found');
  return r.rows[0] as { id: string; ring_order: number; status: string };
}

export async function advanceRing(planId: string, ringCode: RingCode): Promise<{ ring_id: string; status: string }> {
  await actor();
  const ring = await findRing(planId, ringCode);
  if (ring.status === 'succeeded' || ring.status === 'failed') {
    throw new Error(`ring already terminal: ${ring.status}`);
  }
  await masterQuery(
    `UPDATE dos.rollout_ring SET status='succeeded', ended_at=now()
       WHERE id=$1::uuid`,
    [ring.id],
  );
  await masterQuery(
    `UPDATE dos.rollout_plan SET status='running' WHERE id=$1::uuid AND status='draft'`,
    [planId],
  );
  // Activate next ring if any.
  const next = await masterQuery(
    `UPDATE dos.rollout_ring SET status='active', started_at=now()
      WHERE plan_id=$1::uuid AND ring_order=$2 AND status='pending'
      RETURNING id, ring_code`,
    [planId, ring.ring_order + 1],
  );
  if (!next.rows.length) {
    await masterQuery(`UPDATE dos.rollout_plan SET status='succeeded' WHERE id=$1::uuid`, [planId]);
  }
  return { ring_id: ring.id, status: 'succeeded' };
}

export async function rollbackRing(planId: string, ringCode: RingCode, triggeredBy: string, reason: string): Promise<{ ring_id: string; status: string }> {
  await actor();
  const ring = await findRing(planId, ringCode);
  await masterQuery(
    `INSERT INTO dos.rollout_rollback (ring_id, triggered_by, reason, succeeded_at)
     VALUES ($1::uuid, $2, $3, now())`,
    [ring.id, triggeredBy, reason],
  );
  await masterQuery(
    `UPDATE dos.rollout_ring SET status='rolled_back', ended_at=now() WHERE id=$1::uuid`,
    [ring.id],
  );
  await masterQuery(
    `UPDATE dos.rollout_plan SET status='rolled_back' WHERE id=$1::uuid`,
    [planId],
  );
  await masterQuery(
    `INSERT INTO dos.dos_master_invalidation_log (scope, scope_key, reason, cache_version, fan_out_count)
     VALUES ('global', $1, $2, 'v1', 0)`,
    [`rollout:${planId}:${ringCode}`, `rollout_rollback:${reason}`],
  );
  return { ring_id: ring.id, status: 'rolled_back' };
}

export interface EvaluationOutcome {
  decision: 'hold' | 'advance' | 'rollback';
  breaches: string[];
  evaluation_id: number;
}

export async function evaluateRing(planId: string, ringCode: RingCode, signals: Record<string, number>): Promise<EvaluationOutcome> {
  await actor();
  const ring = await findRing(planId, ringCode);
  const gates = await masterQuery(
    `SELECT gate_kind, threshold, comparator FROM dos.rollout_health_gate WHERE ring_id=$1::uuid`,
    [ring.id],
  );
  const breaches: string[] = [];
  for (const g of gates.rows as Array<{ gate_kind: string; threshold: string; comparator: string }>) {
    const observed = signals[g.gate_kind];
    if (observed === undefined) continue;
    const t = Number(g.threshold);
    let pass = true;
    switch (g.comparator) {
      case 'lt':  pass = observed <  t; break;
      case 'lte': pass = observed <= t; break;
      case 'gt':  pass = observed >  t; break;
      case 'gte': pass = observed >= t; break;
      case 'eq':  pass = observed === t; break;
    }
    if (!pass) breaches.push(`${g.gate_kind}(${observed} ${g.comparator} ${t})`);
  }
  const decision: EvaluationOutcome['decision'] = breaches.length ? 'rollback' : 'advance';
  const ev = await masterQuery(
    `INSERT INTO dos.rollout_evaluation (ring_id, decision, signals)
     VALUES ($1::uuid, $2, $3::jsonb) RETURNING id`,
    [ring.id, decision, JSON.stringify({ ...signals, breaches })],
  );
  return { decision, breaches, evaluation_id: Number((ev.rows[0] as { id: number }).id) };
}
