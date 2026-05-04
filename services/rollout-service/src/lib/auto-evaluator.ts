import { masterQuery } from '@dos/db/master';
import { evaluateRing, rollbackRing, type RingCode } from './rollout-repo.js';

const POLL_MS = Number(process.env.ROLLOUT_POLL_MS ?? 60_000);
const AUTO_ROLLBACK = process.env.ROLLOUT_AUTO_ROLLBACK !== '0';

interface SignalReader {
  readSignals(planId: string, ringCode: RingCode): Promise<Record<string, number>>;
}

class StubSignalReader implements SignalReader {
  // M14 D2 — synthetic reader. M14 D3 swaps real Prom/Loki/Jaeger
  // adapters in via @dos/observability-clients.
  async readSignals(): Promise<Record<string, number>> {
    return {
      prom_error_rate: 0.001,
      jaeger_p95_latency: 200,
      loki_error_volume: 5,
      audit_denial_spike: 1,
      synthetic_pageload: 0.99,
    };
  }
}

let timer: NodeJS.Timeout | null = null;
let reader: SignalReader = new StubSignalReader();

export function setSignalReader(r: SignalReader): void {
  reader = r;
}

async function tick(): Promise<void> {
  await masterQuery(`SET dos.actor = 'dos-master'`);
  const active = await masterQuery(
    `SELECT r.plan_id, r.ring_code
       FROM dos.rollout_ring r
       JOIN dos.rollout_plan p ON p.id = r.plan_id
      WHERE r.status = 'active' AND p.status IN ('draft','running')`,
  );
  for (const row of active.rows as Array<{ plan_id: string; ring_code: RingCode }>) {
    try {
      const signals = await reader.readSignals(row.plan_id, row.ring_code);
      const outcome = await evaluateRing(row.plan_id, row.ring_code, signals);
      if (outcome.decision === 'rollback' && AUTO_ROLLBACK) {
        await rollbackRing(row.plan_id, row.ring_code, 'rollout-service:auto', `auto: ${outcome.breaches.join(', ')}`);
        // eslint-disable-next-line no-console
        console.warn(`[rollout-service] auto-rolled-back ${row.ring_code} of plan ${row.plan_id}: ${outcome.breaches.join(', ')}`);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`[rollout-service] tick error for ${row.plan_id}/${row.ring_code}:`, (e as Error).message);
    }
  }
}

export function startAutoEvaluator(): void {
  if (timer) return;
  // eslint-disable-next-line no-console
  console.log(`[rollout-service] auto-evaluator started (poll=${POLL_MS}ms, auto-rollback=${AUTO_ROLLBACK})`);
  timer = setInterval(() => { tick().catch(() => undefined); }, POLL_MS);
}

export function stopAutoEvaluator(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
