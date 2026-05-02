/**
 * ClickHouse lifecycle adapter for analytics-service.
 *
 * Responsibilities:
 *   - On boot: ensure analytics tables exist (DDL) and start the flush timer.
 *   - Periodic health probe: updates the `dos_clickhouse_up` gauge so Grafana /
 *     alertmanager can detect a ClickHouse outage.
 *   - Graceful shutdown: best-effort flush of the in-memory batch buffer.
 *
 * Gated on CLICKHOUSE_ENABLED — noop when disabled.
 */
import { logger, setClickHouseHealth } from '@dos/platform-core/observability';

interface ClickHouseBootstrapHandle {
  healthTimer: ReturnType<typeof setInterval> | null;
}

let _handle: ClickHouseBootstrapHandle | null = null;

function loadClickHouseModule() {
  try {
    const clientMod = require(
      '../../../../modules/analytics/source/config/clickhouse-client',
    ) as {
      isClickHouseEnabled: () => boolean;
      ensureClickHouseTables: () => Promise<void>;
      checkClickHouseHealth: () => Promise<{ healthy: boolean; error?: string; version?: string }>;
    };
    const svcMod = require(
      '../../../../modules/analytics/dist/analytics/services/misc/clickhouse-analytics.service',
    ) as {
      startFlushTimer: () => void;
      flushAll: () => Promise<void>;
    };
    return { clientMod, svcMod };
  } catch (err) {
    logger.warn('[analytics-service] ClickHouse module unavailable, skipping bootstrap', {
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function bootstrapClickHouse(): Promise<void> {
  const mods = loadClickHouseModule();
  if (!mods) return;
  const { clientMod, svcMod } = mods;

  if (!clientMod.isClickHouseEnabled()) {
    logger.info('[analytics-service] ClickHouse disabled (CLICKHOUSE_ENABLED != true) — skipping bootstrap');
    setClickHouseHealth(false);
    return;
  }

  try {
    await clientMod.ensureClickHouseTables();
  } catch (err) {
    logger.error('[analytics-service] ensureClickHouseTables failed', {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  svcMod.startFlushTimer();

  const probe = async () => {
    try {
      const h = await clientMod.checkClickHouseHealth();
      setClickHouseHealth(!!h.healthy);
      if (!h.healthy) {
        logger.warn('[analytics-service] ClickHouse health probe failed', { err: h.error });
      }
    } catch (err) {
      setClickHouseHealth(false);
      logger.warn('[analytics-service] ClickHouse health probe threw', {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  };
  await probe();
  const healthTimer = setInterval(() => { void probe(); }, 30_000);
  healthTimer.unref?.();

  _handle = { healthTimer };

  const shutdown = async () => {
    try { await svcMod.flushAll(); } catch { /* best effort */ }
    if (_handle?.healthTimer) clearInterval(_handle.healthTimer);
    _handle = null;
  };
  process.once('SIGTERM', () => { void shutdown(); });
  process.once('SIGINT', () => { void shutdown(); });

  logger.info('[analytics-service] ClickHouse bootstrap complete (tables ensured, flush timer running)');
}

export async function clickHouseHealthCheck(): Promise<boolean> {
  // Read intent from env BEFORE attempting to load the optional client module,
  // so a missing module cannot poison readiness when ClickHouse is disabled.
  const enabled = (process.env.CLICKHOUSE_ENABLED ?? '').toLowerCase() === 'true';
  if (!enabled) return true; // not applicable → don't fail readiness

  const mods = loadClickHouseModule();
  if (!mods) {
    // Real config drift: caller asked for ClickHouse but the client module is absent.
    return false;
  }
  if (!mods.clientMod.isClickHouseEnabled()) return true;
  try {
    const h = await mods.clientMod.checkClickHouseHealth();
    return !!h.healthy;
  } catch {
    return false;
  }
}
