import { z as _z } from 'zod';
import { safeQuery } from '../../action/ports/database.port';
import type { BenchmarkCatalog, BenchmarkEvaluation } from '../types/benchmarks.types';

export class BenchmarksRepository {
  async getCatalogs(tenantId: string): Promise<BenchmarkCatalog[]> {
    const result = await safeQuery(
      `SELECT * FROM benchmark_catalogs WHERE tenant_id = $1`, [tenantId]
    );
    return result.rows as BenchmarkCatalog[];
  }

  async getEvaluations(tenantId: string): Promise<BenchmarkEvaluation[]> {
    const result = await safeQuery(
      `SELECT * FROM benchmark_evaluations WHERE tenant_id = $1`, [tenantId]
    );
    return result.rows as BenchmarkEvaluation[];
  }
}

export const benchmarksRepository = new BenchmarksRepository();
