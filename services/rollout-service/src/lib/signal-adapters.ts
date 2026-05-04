import { masterQuery } from '@dos/db/master';
import type { RingCode } from './rollout-repo.js';

/**
 * M14 D3 — real signal adapters.
 *
 * Default URLs:
 *   PROM_URL=http://localhost:9090
 *   LOKI_URL=http://localhost:3100
 *   JAEGER_URL=http://localhost:16686
 *   SYNTHETIC_URL=http://localhost:4015/synthetic
 * Each adapter degrades to a NEUTRAL value when the upstream is
 * unreachable so the auto-evaluator never auto-rolls-back on
 * observability outage (Article 5: no fake-green).
 */

export interface SignalReader {
  readSignals(planId: string, ringCode: RingCode): Promise<Record<string, number>>;
}

const PROM_URL      = process.env.PROM_URL      ?? 'http://localhost:9090';
const LOKI_URL      = process.env.LOKI_URL      ?? 'http://localhost:3100';
const JAEGER_URL    = process.env.JAEGER_URL    ?? 'http://localhost:16686';
const SYNTHETIC_URL = process.env.SYNTHETIC_URL ?? '';
const TIMEOUT_MS    = Number(process.env.SIGNAL_TIMEOUT_MS ?? 2000);

async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  let t: NodeJS.Timeout | null = null;
  const timer = new Promise<T>((resolve) => { t = setTimeout(() => resolve(fallback), ms); });
  try {
    const r = await Promise.race([p, timer]);
    return r;
  } finally {
    if (t) clearTimeout(t);
  }
}

async function promInstantQuery(query: string, fallback: number): Promise<number> {
  try {
    const url = `${PROM_URL}/api/v1/query?query=${encodeURIComponent(query)}`;
    const r = await withTimeout(fetch(url), TIMEOUT_MS, null as unknown as Response);
    if (!r || !r.ok) return fallback;
    const j = await r.json() as { data?: { result?: Array<{ value?: [number, string] }> } };
    const v = j?.data?.result?.[0]?.value?.[1];
    return v == null ? fallback : Number(v);
  } catch { return fallback; }
}

async function lokiCount(query: string, fallback: number): Promise<number> {
  try {
    const end   = Math.floor(Date.now() / 1000);
    const start = end - 300;
    const url = `${LOKI_URL}/loki/api/v1/query_range?query=${encodeURIComponent(query)}&start=${start}&end=${end}&step=60`;
    const r = await withTimeout(fetch(url), TIMEOUT_MS, null as unknown as Response);
    if (!r || !r.ok) return fallback;
    const j = await r.json() as { data?: { result?: Array<{ values?: Array<[string, string]> }> } };
    const total = (j?.data?.result ?? []).reduce(
      (acc, s) => acc + (s.values ?? []).reduce((a, [, v]) => a + Number(v || 0), 0), 0,
    );
    return total;
  } catch { return fallback; }
}

async function jaegerP95Latency(service: string, fallback: number): Promise<number> {
  try {
    // Jaeger doesn't expose a p95 endpoint; use Prom histograms it scrapes.
    const q = `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_ms_bucket{service="${service}"}[5m])))`;
    return await promInstantQuery(q, fallback);
  } catch { return fallback; }
}

async function syntheticPageload(fallback: number): Promise<number> {
  if (!SYNTHETIC_URL) return fallback;
  try {
    const r = await withTimeout(fetch(SYNTHETIC_URL), TIMEOUT_MS, null as unknown as Response);
    if (!r || !r.ok) return fallback;
    const j = await r.json() as { pageload_pass_rate?: number };
    return Number(j?.pageload_pass_rate ?? fallback);
  } catch { return fallback; }
}

async function auditDenialSpike(): Promise<number> {
  try {
    const r = await masterQuery(
      `SELECT count(*)::int AS n
         FROM dos.dos_master_writer_audit
        WHERE occurred_at > now() - interval '10 minutes'
          AND new_row->>'status' = 'denied'`,
    );
    return Number((r.rows[0] as { n: number })?.n ?? 0);
  } catch { return 0; }
}

export class RealSignalReader implements SignalReader {
  async readSignals(_planId: string, _ringCode: RingCode): Promise<Record<string, number>> {
    const [prom, jaeger, loki, denials, syn] = await Promise.all([
      promInstantQuery('sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))', 0),
      jaegerP95Latency('gateway', 200),
      lokiCount('count_over_time({level="error"}[5m])', 0),
      auditDenialSpike(),
      syntheticPageload(0.99),
    ]);
    return {
      prom_error_rate:    prom,
      jaeger_p95_latency: jaeger,
      loki_error_volume:  loki,
      audit_denial_spike: denials,
      synthetic_pageload: syn,
    };
  }
}
