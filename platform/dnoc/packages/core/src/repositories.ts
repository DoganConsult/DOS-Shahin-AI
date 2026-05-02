/**
 * DNOC persistence ports.
 *
 * Five repositories (metrics, logs, traces, routes, health) with an
 * in-memory adapter for tests and a Postgres adapter for production.
 * The DNOCPort impl composes them.
 */

import type {
  DNOCMetric,
  DNOCLogEntry,
  DNOCTraceSpan,
  DNOCRouteDescriptor,
  DNOCHealthStatus,
} from '@dos/ports/dnoc';

// ───────── Metrics ─────────

export interface MetricsRepository {
  record(metric: DNOCMetric): void;
  count(): Promise<number>;
  recent(name: string, limit: number): Promise<readonly DNOCMetric[]>;
}

export class InMemoryMetricsRepository implements MetricsRepository {
  private rows: DNOCMetric[] = [];
  record(m: DNOCMetric): void {
    this.rows.push({ ...m, timestamp: m.timestamp ?? new Date().toISOString() });
  }
  async count(): Promise<number> { return this.rows.length; }
  async recent(name: string, limit: number): Promise<readonly DNOCMetric[]> {
    return this.rows.filter((r) => r.name === name).slice(-limit).reverse();
  }
}

export class PgMetricsRepository implements MetricsRepository {
  constructor(private readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>) {}
  private pending: DNOCMetric[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  record(m: DNOCMetric): void {
    // Metrics are high-volume; buffer and flush in batches.
    this.pending.push({ ...m, timestamp: m.timestamp ?? new Date().toISOString() });
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => void this.flush(), 250);
    }
  }

  /**
   * Force the buffered batch to disk right now. Called at service
   * shutdown so no buffered samples are lost when the process exits.
   */
  async forceFlush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  private async flush(): Promise<void> {
    const batch = this.pending.splice(0);
    this.flushTimer = null;
    if (batch.length === 0) return;
    // One multi-row insert per flush.
    const values = batch.map((_, i) => {
      const o = i * 5;
      return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5})`;
    }).join(',');
    const params: unknown[] = [];
    for (const m of batch) {
      params.push(m.name, m.kind, m.value, JSON.stringify(m.labels ?? {}), m.timestamp);
    }
    await this.query(
      `INSERT INTO platform_dnoc.metrics (name, kind, value, labels, recorded_at) VALUES ${values}`,
      params,
    );
  }

  async count(): Promise<number> {
    await this.flush();
    const { rows } = await this.query(`SELECT COUNT(*)::int AS c FROM platform_dnoc.metrics`, []);
    return rows[0]?.c ?? 0;
  }

  async recent(name: string, limit: number): Promise<readonly DNOCMetric[]> {
    await this.flush();
    const { rows } = await this.query(
      `SELECT name, kind, value, labels, recorded_at
         FROM platform_dnoc.metrics
        WHERE name = $1
        ORDER BY recorded_at DESC
        LIMIT $2`,
      [name, limit],
    );
    return rows.map((r) => ({
      name: r.name,
      kind: r.kind,
      value: Number(r.value),
      labels: r.labels ?? {},
      timestamp: r.recorded_at instanceof Date ? r.recorded_at.toISOString() : String(r.recorded_at),
    }));
  }
}

// ───────── Logs ─────────

export interface LogsRepository {
  emit(entry: DNOCLogEntry): void;
  count(): Promise<number>;
}

export class InMemoryLogsRepository implements LogsRepository {
  private rows: DNOCLogEntry[] = [];
  emit(entry: DNOCLogEntry): void { this.rows.push(entry); }
  async count(): Promise<number> { return this.rows.length; }
}

export class PgLogsRepository implements LogsRepository {
  constructor(private readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>) {}
  emit(entry: DNOCLogEntry): void {
    // Fire-and-forget write; logs shouldn't block the caller.
    void this.query(
      `INSERT INTO platform_dnoc.logs (level, message, module_code, tenant_id, correlation_id, attributes)
         VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        entry.level,
        entry.message,
        entry.moduleCode,
        entry.tenantId ?? null,
        entry.correlationId ?? null,
        JSON.stringify(entry.attributes ?? {}),
      ],
    ).catch(() => { /* log-of-log failures are swallowed */ });
  }
  async count(): Promise<number> {
    const { rows } = await this.query(`SELECT COUNT(*)::int AS c FROM platform_dnoc.logs`, []);
    return rows[0]?.c ?? 0;
  }
}

// ───────── Traces ─────────

export interface TracesRepository {
  emit(span: DNOCTraceSpan): void;
  count(): Promise<number>;
  byTraceId(traceId: string): Promise<readonly DNOCTraceSpan[]>;
}

export class InMemoryTracesRepository implements TracesRepository {
  private rows: DNOCTraceSpan[] = [];
  emit(s: DNOCTraceSpan): void { this.rows.push(s); }
  async count(): Promise<number> { return this.rows.length; }
  async byTraceId(traceId: string): Promise<readonly DNOCTraceSpan[]> {
    return this.rows.filter((r) => r.traceId === traceId);
  }
}

export class PgTracesRepository implements TracesRepository {
  constructor(private readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>) {}
  emit(s: DNOCTraceSpan): void {
    void this.query(
      `INSERT INTO platform_dnoc.traces (trace_id, span_id, parent_span_id, name, started_at, ended_at, attributes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (trace_id, span_id) DO NOTHING`,
      [s.traceId, s.spanId, s.parentSpanId ?? null, s.name, s.startedAt, s.endedAt, JSON.stringify(s.attributes ?? {})],
    ).catch(() => {});
  }
  async count(): Promise<number> {
    const { rows } = await this.query(`SELECT COUNT(*)::int AS c FROM platform_dnoc.traces`, []);
    return rows[0]?.c ?? 0;
  }
  async byTraceId(traceId: string): Promise<readonly DNOCTraceSpan[]> {
    const { rows } = await this.query(
      `SELECT trace_id, span_id, parent_span_id, name, started_at, ended_at, attributes
         FROM platform_dnoc.traces WHERE trace_id = $1 ORDER BY started_at ASC`,
      [traceId],
    );
    return rows.map((r) => ({
      traceId: r.trace_id,
      spanId: r.span_id,
      parentSpanId: r.parent_span_id ?? undefined,
      name: r.name,
      startedAt: r.started_at instanceof Date ? r.started_at.toISOString() : String(r.started_at),
      endedAt: r.ended_at instanceof Date ? r.ended_at.toISOString() : String(r.ended_at),
      attributes: r.attributes ?? {},
    }));
  }
}

// ───────── Routes ─────────

export interface RoutesRepository {
  register(route: DNOCRouteDescriptor): Promise<void>;
  listActive(serviceCode: string): Promise<readonly DNOCRouteDescriptor[]>;
  deregister(serviceCode: string, method: string, path: string): Promise<boolean>;
}

export class InMemoryRoutesRepository implements RoutesRepository {
  private rows: Array<DNOCRouteDescriptor & { deregisteredAt?: string }> = [];
  async register(route: DNOCRouteDescriptor): Promise<void> {
    const idx = this.rows.findIndex(
      (r) => r.serviceCode === route.serviceCode && r.method === route.method && r.path === route.path,
    );
    if (idx === -1) this.rows.push({ ...route });
    else this.rows[idx] = { ...route };
  }
  async listActive(serviceCode: string): Promise<readonly DNOCRouteDescriptor[]> {
    return this.rows.filter((r) => r.serviceCode === serviceCode && !r.deregisteredAt);
  }
  async deregister(serviceCode: string, method: string, path: string): Promise<boolean> {
    const row = this.rows.find((r) => r.serviceCode === serviceCode && r.method === method && r.path === path);
    if (!row || row.deregisteredAt) return false;
    (row as { deregisteredAt?: string }).deregisteredAt = new Date().toISOString();
    return true;
  }
}

export class PgRoutesRepository implements RoutesRepository {
  constructor(private readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>) {}
  async register(route: DNOCRouteDescriptor): Promise<void> {
    await this.query(
      `INSERT INTO platform_dnoc.routes (module_code, service_code, method, path, auth_required, rate_limit_rpm)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (service_code, method, path) DO UPDATE
           SET module_code   = EXCLUDED.module_code,
               auth_required = EXCLUDED.auth_required,
               rate_limit_rpm = EXCLUDED.rate_limit_rpm,
               registered_at  = NOW(),
               deregistered_at = NULL`,
      [
        route.moduleCode,
        route.serviceCode,
        route.method,
        route.path,
        route.authRequired,
        route.rateLimit?.rpm ?? null,
      ],
    );
  }
  async listActive(serviceCode: string): Promise<readonly DNOCRouteDescriptor[]> {
    const { rows } = await this.query(
      `SELECT module_code, service_code, method, path, auth_required, rate_limit_rpm
         FROM platform_dnoc.routes
         WHERE service_code = $1 AND deregistered_at IS NULL`,
      [serviceCode],
    );
    return rows.map((r) => ({
      moduleCode: r.module_code,
      serviceCode: r.service_code,
      method: r.method,
      path: r.path,
      authRequired: r.auth_required,
      rateLimit: r.rate_limit_rpm ? { rpm: r.rate_limit_rpm } : undefined,
    }));
  }
  async deregister(serviceCode: string, method: string, path: string): Promise<boolean> {
    const { rows } = await this.query(
      `UPDATE platform_dnoc.routes
          SET deregistered_at = NOW()
          WHERE service_code = $1 AND method = $2 AND path = $3 AND deregistered_at IS NULL
          RETURNING id`,
      [serviceCode, method, path],
    );
    return rows.length > 0;
  }
}

// ───────── Health ─────────

export interface HealthRepository {
  record(serviceCode: string, status: DNOCHealthStatus, details?: Record<string, unknown>): Promise<void>;
  latest(serviceCode: string): Promise<DNOCHealthStatus>;
}

export class InMemoryHealthRepository implements HealthRepository {
  private rows: Array<{ serviceCode: string; status: DNOCHealthStatus }> = [];
  async record(serviceCode: string, status: DNOCHealthStatus): Promise<void> {
    // Insertion order is the canonical ordering — ms-granularity timestamps
    // can collide on back-to-back inserts and break "latest" tests.
    this.rows.push({ serviceCode, status });
  }
  async latest(serviceCode: string): Promise<DNOCHealthStatus> {
    for (let i = this.rows.length - 1; i >= 0; i--) {
      if (this.rows[i].serviceCode === serviceCode) return this.rows[i].status;
    }
    return 'unknown';
  }
}

export class PgHealthRepository implements HealthRepository {
  constructor(private readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>) {}
  async record(serviceCode: string, status: DNOCHealthStatus, details?: Record<string, unknown>): Promise<void> {
    await this.query(
      `INSERT INTO platform_dnoc.health_checks (service_code, status, details) VALUES ($1,$2,$3)`,
      [serviceCode, status, JSON.stringify(details ?? {})],
    );
  }
  async latest(serviceCode: string): Promise<DNOCHealthStatus> {
    const { rows } = await this.query(
      `SELECT status FROM platform_dnoc.health_checks
         WHERE service_code = $1 ORDER BY checked_at DESC LIMIT 1`,
      [serviceCode],
    );
    return (rows[0]?.status as DNOCHealthStatus) ?? 'unknown';
  }
}
