import { logger } from '../../ports/logger.port';
/**
 * Qiyas Benchmarks service.
 * Manages benchmark datasets, comparisons, and percentile computations.
 */
import { emptyResult, query, safeQuery } from '../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { QiyasScoringService } from './qiyas-scoring.service';
import type { GenericRow as _GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

export class QiyasBenchmarksService {

  private scoringSvc = new QiyasScoringService();

  async listBenchmarkComparisons(schema: string, assessmentId: string) {
    return (await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
      `SELECT * FROM "${schema}".qiyas_benchmark_comparisons WHERE qiyas_assessment_id = $1::uuid ORDER BY created_at DESC`,
      [assessmentId]
    ), { operation: 'query qiyas_benchmark_comparisons' })).rows;
  }

  async getBenchmarkPercentiles(schema: string, assessmentId: string) {
    return (await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
      `SELECT * FROM "${schema}".qiyas_benchmark_percentiles WHERE qiyas_assessment_id = $1::uuid`,
      [assessmentId]
    ), { operation: 'query qiyas_benchmark_comparisons' })).rows;
  }

  /** Create a new benchmark dataset */
  async createBenchmarkDataset(schema: string, data: unknown): Promise<unknown> {
    try {
      const result = await safeQuery(
        `INSERT INTO "${schema}".qiyas_benchmark_datasets
           (name_en, name_ar, description, sector, region, sample_size, metrics, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
         RETURNING *`,

        [data.name_en, data.name_ar || null, data.description || null,

         data.sector || null, data.region || null, data.sample_size ?? 0,

         JSON.stringify(data.metrics || {}), data.created_by || null]
      );
      return result.rows[0];
    } catch (err: unknown) {
      logger.error(`[QiyasBenchmarksService] createBenchmarkDataset failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** Compute benchmark comparison: percentiles of assessment scores against a dataset */
  async computeBenchmarkComparison(schema: string, assessmentId: string, datasetId: string): Promise<unknown> {
    try {
      // Get assessment scores
      const scores = await this.scoringSvc.getAssessmentScores(schema, assessmentId);
      // Get benchmark dataset metrics
      const dsResult = await safeQuery(
        `SELECT * FROM "${schema}".qiyas_benchmark_datasets WHERE dataset_id = $1::uuid`,
        [datasetId]
      );
      const dataset = dsResult.rows[0];
      if (!dataset) throw new Error(`Benchmark dataset ${datasetId} not found`);

      const metrics = dataset.metrics || {};
      const comparisons: unknown[] = [];

      // Compute percentiles per domain score against dataset metrics
      for (const ds of scores.domainScores) {
        const benchmarkMean = metrics[ds.domain_id]?.mean ?? 0;
        const benchmarkStdDev = metrics[ds.domain_id]?.std_dev ?? 1;
        // Simple percentile estimate using z-score
        const zScore = benchmarkStdDev > 0 ? (ds.raw_score - benchmarkMean) / benchmarkStdDev : 0;
        const percentile = Math.min(99, Math.max(1, Math.round(50 + zScore * 30)));

        comparisons.push({
          domain_id: ds.domain_id,
          assessment_score: ds.raw_score,
          benchmark_mean: benchmarkMean,
          percentile,
        });
      }

      // Persist the comparison
      const compResult = await safeQuery(
        `INSERT INTO "${schema}".qiyas_benchmark_comparisons
           (qiyas_assessment_id, dataset_id, comparison_data, computed_at)
         VALUES ($1::uuid, $2::uuid, $3::jsonb, NOW())
         RETURNING *`,
        [assessmentId, datasetId, JSON.stringify(comparisons)]
      );

      return { comparison: compResult.rows[0], details: comparisons };
    } catch (err: unknown) {
      logger.error(`[QiyasBenchmarksService] computeBenchmarkComparison failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** List all benchmark datasets */
  async listBenchmarkDatasets(schema: string): Promise<Record<string, unknown>[]> {
    try {
      const result = await safeQuery(
        `SELECT * FROM "${schema}".qiyas_benchmark_datasets ORDER BY created_at DESC`
      );
      return result.rows;
    } catch (err: unknown) {
      logger.error(`[QiyasBenchmarksService] listBenchmarkDatasets failed: ${toErrorMessage(err)}`);
      return [];
    }
  }
}
