/**
 * Wave 12 — Multi-region data residency.
 *
 * KSA PDPL Art 29 + GDPR Art 44 require tenant data to remain in approved
 * regions. Each tenant pins to a region at onboarding; cross-region reads
 * are off by default. CCM connectors and external APIs respect the tenant
 * region (no cross-region traffic without explicit DPA-approved contract).
 *
 * This service:
 *   - Resolves tenant.region from dos.tenants.region
 *   - Routes DB connections to the region's primary
 *   - Enforces residency: throws if cross-region access attempted
 *   - Provides region-failover hooks for Wave 13 DR
 */
import type { DbClient } from '../../db/runner';

export type Region = 'ksa-central' | 'eu-west' | 'us-east' | 'apac-sg' | 'apac-tokyo';

export interface RegionInfo {
  code: Region;
  displayName: string;
  /** Sovereignty constraint: only certain regulators allow data leaving. */
  exitAllowed: 'never' | 'with-dpa' | 'unrestricted';
  /** Regulators that pin tenants to this region. */
  pinRegulators: string[];
  /** ISO 3166 country/territory code. */
  iso3166: string;
}

export const REGION_CATALOG: Record<Region, RegionInfo> = {
  'ksa-central': {
    code: 'ksa-central',
    displayName: 'KSA Central (Riyadh)',
    exitAllowed: 'never',
    pinRegulators: ['SAMA', 'NCA', 'PDPL-KSA', 'CITC'],
    iso3166: 'SA',
  },
  'eu-west': {
    code: 'eu-west',
    displayName: 'EU West (Frankfurt)',
    exitAllowed: 'with-dpa',
    pinRegulators: ['GDPR', 'NIS2', 'DORA', 'Schrems-II'],
    iso3166: 'DE',
  },
  'us-east': {
    code: 'us-east',
    displayName: 'US East (Virginia)',
    exitAllowed: 'with-dpa',
    pinRegulators: ['HIPAA', 'FedRAMP', 'CCPA'],
    iso3166: 'US',
  },
  'apac-sg': {
    code: 'apac-sg',
    displayName: 'APAC Singapore',
    exitAllowed: 'with-dpa',
    pinRegulators: ['PDPA-SG', 'MAS'],
    iso3166: 'SG',
  },
  'apac-tokyo': {
    code: 'apac-tokyo',
    displayName: 'APAC Tokyo',
    exitAllowed: 'with-dpa',
    pinRegulators: ['APPI'],
    iso3166: 'JP',
  },
};

export class CrossRegionAccessError extends Error {
  readonly tenantRegion: Region;
  readonly callerRegion: Region;
  constructor(tenantRegion: Region, callerRegion: Region) {
    super(
      `cross-region access denied: tenant pinned to ${tenantRegion}, caller in ${callerRegion}. ` +
      `KSA PDPL Art 29 / GDPR Art 44 residency enforcement.`,
    );
    this.name = 'CrossRegionAccessError';
    this.tenantRegion = tenantRegion;
    this.callerRegion = callerRegion;
  }
}

/**
 * Resolve a tenant's pinned region. Throws if tenant has no region set
 * (onboarding bug — every tenant must pin at creation).
 */
export async function getTenantRegion(client: DbClient, tenantId: string): Promise<Region> {
  const res = await client.query<{ region: Region | null }>(
    `SELECT region FROM dos.tenants WHERE id = $1 LIMIT 1`,
    [tenantId],
  );
  const region = res.rows[0]?.region;
  if (!region) {
    throw new Error(`tenant ${tenantId} has no region pinned (onboarding contract violation)`);
  }
  if (!(region in REGION_CATALOG)) {
    throw new Error(`tenant ${tenantId} pinned to unknown region: ${region}`);
  }
  return region;
}

/**
 * Assert the calling process is in the same region as the tenant.
 * Throws CrossRegionAccessError if not. Tenant region should be cached
 * per-request by upstream auth middleware to avoid a query per call.
 */
export function assertSameRegion(tenantRegion: Region, callerRegion: Region): void {
  if (tenantRegion !== callerRegion) {
    throw new CrossRegionAccessError(tenantRegion, callerRegion);
  }
}

/**
 * Read the current process's region from environment. Set in deployment
 * manifest (`DOS_REGION=ksa-central`).
 */
export function currentProcessRegion(): Region {
  const v = process.env.DOS_REGION as Region | undefined;
  if (!v || !(v in REGION_CATALOG)) {
    // Local dev fallback — production deployments MUST set DOS_REGION.
    return 'ksa-central';
  }
  return v;
}

/**
 * Region-aware connection routing helper. Hosts call this to choose the
 * right DB pool. Implementation is deployment-specific (per-region pool
 * registry) — this stub returns the default pool.
 */
export interface RegionPoolRegistry {
  getPool(region: Region): { connect: () => Promise<unknown>; query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };
}

let _poolRegistry: RegionPoolRegistry | null = null;
export function bindRegionPoolRegistry(registry: RegionPoolRegistry): void {
  _poolRegistry = registry;
}

export function getRegionPool(region: Region): ReturnType<RegionPoolRegistry['getPool']> {
  if (!_poolRegistry) {
    throw new Error('region pool registry not bound — call bindRegionPoolRegistry() at host bootstrap');
  }
  return _poolRegistry.getPool(region);
}

/**
 * Region-aware health check: confirms current process can read its own
 * region's primary, lists replica lags. Used by /readyz when DOS_REGION
 * is set. Wave 13 DR runbook references this.
 */
export interface RegionHealth {
  region: Region;
  primaryHealthy: boolean;
  replicaLagSeconds: number | null;
  lastCheckedAt: string;
}

export async function checkRegionHealth(client: DbClient, region: Region): Promise<RegionHealth> {
  const primary = await client.query<{ ok: number }>(`SELECT 1 AS ok`).then(
    (r) => r.rows[0]?.ok === 1,
    () => false,
  );
  // Replication lag query is Postgres-specific. Will return null on
  // non-streaming-replica setups (e.g., single-AZ dev).
  let lag: number | null = null;
  try {
    const r = await client.query<{ lag: number }>(
      `SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::int AS lag`,
    );
    lag = r.rows[0]?.lag ?? null;
  } catch { /* non-replica; ignore */ }
  return {
    region,
    primaryHealthy: primary,
    replicaLagSeconds: lag,
    lastCheckedAt: new Date().toISOString(),
  };
}
