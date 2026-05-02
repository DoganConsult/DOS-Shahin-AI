// @ts-nocheck
/**
 * Benchmarks Service — Spec §3.1: Catalog, Mapping, Scoring, Peer Comparison, Diagnostics
 */
import { safeQuery, tenantSchema } from '../ports/benchmarks.ports';
import { BenchmarkCatalogContract, BenchmarkMappingContract, BenchmarkScoreContract, BenchmarkDiagnosticsContract } from '../contracts/benchmarks.contract';
import { setAuditData } from '@dos/module-auth';

// ── Benchmark Catalog Service ──
export async function createBenchmark(tenantId: string, userId: string, data: { name: string; description?: string; version?: string; provider: string; frameworkCode?: string; releaseDate?: string }): Promise<BenchmarkCatalogContract> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".benchmarks_catalog (name, description, version, provider, framework_code, release_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING benchmark_id as "benchmarkId", name, description, version, provider, framework_code as "frameworkCode", release_date as "releaseDate", status, metadata_json as "metadataJson", created_at as "createdAt", updated_at as "updatedAt"`,
    [data.name, data.description || null, data.version || '1.0', data.provider, data.frameworkCode || null, data.releaseDate || null]
  );
  const benchmark = result.rows[0];
  await setAuditData(tenantId, 'benchmarks_catalog', benchmark.benchmarkId, 'create', null, benchmark, userId);
  return benchmark as BenchmarkCatalogContract;
}

export async function listBenchmarks(tenantId: string): Promise<BenchmarkCatalogContract[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT benchmark_id as "benchmarkId", name, description, version, provider, framework_code as "frameworkCode", release_date as "releaseDate", status, metadata_json as "metadataJson", created_at as "createdAt", updated_at as "updatedAt"
     FROM "${schema}".benchmarks_catalog WHERE status = 'active' ORDER BY created_at DESC LIMIT 100`
  );
  return result.rows as BenchmarkCatalogContract[];
}

// ── Mapping Service ──
export async function createMapping(tenantId: string, userId: string, data: { benchmarkId: string; internalControlId: string; weight?: number; notes?: string }): Promise<BenchmarkMappingContract> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".benchmark_control_mappings (benchmark_id, internal_control_id, weight, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING mapping_id as "mappingId", benchmark_id as "benchmarkId", internal_control_id as "internalControlId", weight, mapping_status as "mappingStatus", notes, created_at as "createdAt"`,
    [data.benchmarkId, data.internalControlId, data.weight || 1, data.notes || null]
  );
  await setAuditData(tenantId, 'benchmark_control_mappings', result.rows[0].mappingId, 'create', null, result.rows[0], userId);
  return result.rows[0] as BenchmarkMappingContract;
}

export async function listMappings(tenantId: string, benchmarkId: string): Promise<BenchmarkMappingContract[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT mapping_id as "mappingId", benchmark_id as "benchmarkId", internal_control_id as "internalControlId", weight, mapping_status as "mappingStatus", notes, created_at as "createdAt"
     FROM "${schema}".benchmark_control_mappings WHERE benchmark_id = $1 ORDER BY created_at`,
    [benchmarkId]
  );
  return result.rows as BenchmarkMappingContract[];
}

// ── Scoring Service ──
export async function computeScore(tenantId: string, benchmarkId: string, method: string = 'weighted_average'): Promise<BenchmarkScoreContract> {
  const schema = tenantSchema(tenantId);
  // Compute from control mappings
  const mappings = await safeQuery(
    `SELECT weight FROM "${schema}".benchmark_control_mappings WHERE benchmark_id = $1 AND mapping_status = 'mapped'`,
    [benchmarkId]
  );
  const totalWeight = mappings.rows.reduce((sum: number, r: any) => sum + parseFloat(r.weight), 0);
  const score = totalWeight > 0 ? Math.min(totalWeight / mappings.rows.length * 20, 100) : 0;

  const result = await safeQuery(
    `INSERT INTO "${schema}".benchmark_scores (benchmark_id, tenant_id, score, computation_method, breakdown_json)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING score_id as "scoreId", benchmark_id as "benchmarkId", tenant_id as "tenantId", score, max_score as "maxScore", computed_at as "computedAt", computation_method as "computationMethod", status, breakdown_json as "breakdownJson"`,
    [benchmarkId, tenantId, score.toFixed(2), method, JSON.stringify({ mappingCount: mappings.rows.length, totalWeight })]
  );
  return result.rows[0] as BenchmarkScoreContract;
}

export async function getScores(tenantId: string, benchmarkId: string): Promise<BenchmarkScoreContract[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT score_id as "scoreId", benchmark_id as "benchmarkId", tenant_id as "tenantId", score, max_score as "maxScore", computed_at as "computedAt", computation_method as "computationMethod", status, breakdown_json as "breakdownJson"
     FROM "${schema}".benchmark_scores WHERE benchmark_id = $1 ORDER BY computed_at DESC LIMIT 20`,
    [benchmarkId]
  );
  return result.rows as BenchmarkScoreContract[];
}

// ── Peer Comparison Service ──
export async function getPeerData(tenantId: string, benchmarkId: string): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT peer_data_id, benchmark_id, peer_group, avg_score, median_score, p25_score, p75_score, sample_size, snapshot_date
     FROM "${schema}".benchmark_peer_data WHERE benchmark_id = $1 ORDER BY snapshot_date DESC LIMIT 10`,
    [benchmarkId]
  );
  return result.rows;
}

// ── Diagnostics Service ──
export async function runDiagnostics(tenantId: string): Promise<BenchmarkDiagnosticsContract> {
  const schema = tenantSchema(tenantId);
  const total = await safeQuery(`SELECT COUNT(*) as count FROM "${schema}".benchmarks_catalog`);
  const active = await safeQuery(`SELECT COUNT(*) as count FROM "${schema}".benchmarks_catalog WHERE status = 'active'`);
  const mappings = await safeQuery(`SELECT COUNT(*) as count FROM "${schema}".benchmark_control_mappings`);

  return {
    totalBenchmarks: parseInt(total.rows[0]?.count || '0'),
    activeBenchmarks: parseInt(active.rows[0]?.count || '0'),
    totalMappings: parseInt(mappings.rows[0]?.count || '0'),
    unmappedControls: 0,
    healthStatus: parseInt(active.rows[0]?.count || '0') > 0 ? 'healthy' : 'degraded'
  };
}
