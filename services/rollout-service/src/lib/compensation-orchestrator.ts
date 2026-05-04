import { masterQuery } from '@dos/db/master';

/**
 * M14 D4 — compensation chain orchestrator.
 *
 * Stub Temporal-style executor: walks dos.rollout_compensation_step rows
 * for a chain in step_order, dispatches the step_kind to a registered
 * handler, marks success/failure, and short-circuits the chain on the
 * first failed step (chain.status='failed'). When all steps succeed
 * chain.status='compensated'. Real Temporal worker swap-in is M14 D5.
 */

export type StepKind = 'invalidate-cache' | 'restore-revision' | 'unmark-tenant' | 'fan-out-event' | 'noop';
export type StepHandler = (payload: Record<string, unknown>) => Promise<void>;

const HANDLERS = new Map<StepKind, StepHandler>();

async function actor(): Promise<void> {
  await masterQuery(`SET dos.actor = 'dos-master'`);
}

export function registerStepHandler(kind: StepKind, fn: StepHandler): void {
  HANDLERS.set(kind, fn);
}

HANDLERS.set('noop', async () => undefined);
HANDLERS.set('invalidate-cache', async (p) => {
  await masterQuery(
    `INSERT INTO dos.dos_master_invalidation_log (scope, scope_key, reason, cache_version, fan_out_count)
     VALUES ('global', $1, $2, 'v1', 0)`,
    [String(p.scope_key ?? 'compensation'), `compensation:${String(p.reason ?? 'auto')}`],
  );
});
HANDLERS.set('fan-out-event', async (p) => {
  await masterQuery(
    `INSERT INTO dos.dos_master_invalidation_log (scope, scope_key, reason, cache_version, fan_out_count)
     VALUES ($1, $2, $3, 'v1', 0)`,
    [String(p.scope ?? 'global'), String(p.scope_key ?? 'event'), String(p.reason ?? 'compensation')],
  );
});

export interface ChainExecution {
  chain_id: string;
  status: 'compensated' | 'failed';
  steps_executed: number;
  failed_step?: number;
}

export async function executeChain(chainId: string): Promise<ChainExecution> {
  await actor();
  await masterQuery(
    `UPDATE dos.dos_master_compensation_chain SET status='running' WHERE id=$1::uuid AND status='pending'`,
    [chainId],
  );
  const steps = await masterQuery(
    `SELECT id, step_order, step_kind, payload, status FROM dos.rollout_compensation_step
      WHERE chain_id=$1::uuid ORDER BY step_order`,
    [chainId],
  );
  let executed = 0;
  for (const s of steps.rows as Array<{ id: string; step_order: number; step_kind: StepKind; payload: Record<string, unknown>; status: string }>) {
    if (s.status === 'succeeded') { executed++; continue; }
    const handler = HANDLERS.get(s.step_kind);
    if (!handler) {
      await masterQuery(`UPDATE dos.rollout_compensation_step SET status='failed' WHERE id=$1::uuid`, [s.id]);
      await masterQuery(`UPDATE dos.dos_master_compensation_chain SET status='failed' WHERE id=$1::uuid`, [chainId]);
      return { chain_id: chainId, status: 'failed', steps_executed: executed, failed_step: s.step_order };
    }
    await masterQuery(`UPDATE dos.rollout_compensation_step SET status='running' WHERE id=$1::uuid`, [s.id]);
    try {
      await handler(s.payload ?? {});
      await masterQuery(`UPDATE dos.rollout_compensation_step SET status='succeeded' WHERE id=$1::uuid`, [s.id]);
      executed++;
    } catch {
      await masterQuery(`UPDATE dos.rollout_compensation_step SET status='failed' WHERE id=$1::uuid`, [s.id]);
      await masterQuery(`UPDATE dos.dos_master_compensation_chain SET status='failed' WHERE id=$1::uuid`, [chainId]);
      return { chain_id: chainId, status: 'failed', steps_executed: executed, failed_step: s.step_order };
    }
  }
  await masterQuery(`UPDATE dos.dos_master_compensation_chain SET status='compensated' WHERE id=$1::uuid`, [chainId]);
  return { chain_id: chainId, status: 'compensated', steps_executed: executed };
}

export async function createChain(steps: Array<{ kind: StepKind; payload?: Record<string, unknown> }>, changeRequestId?: string | null): Promise<string> {
  await actor();
  const c = await masterQuery(
    `INSERT INTO dos.dos_master_compensation_chain (change_request_id, status, step_count)
     VALUES ($1::uuid, 'pending', $2) RETURNING id`,
    [changeRequestId ?? null, steps.length],
  );
  const chainId = String((c.rows[0] as { id: string }).id);
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    await masterQuery(
      `INSERT INTO dos.rollout_compensation_step (chain_id, step_order, step_kind, payload, status)
       VALUES ($1::uuid, $2, $3, $4::jsonb, 'pending')`,
      [chainId, i + 1, s.kind, JSON.stringify(s.payload ?? {})],
    );
  }
  return chainId;
}
