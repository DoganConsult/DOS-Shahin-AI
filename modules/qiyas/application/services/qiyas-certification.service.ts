import { logger } from '../../ports/logger.port';
/**
 * Qiyas Certification Readiness service.
 * Manages certification readiness checks, gap tracking, and readiness score computation.
 */
import { emptyResult, query, safeQuery } from '../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow as _GenericRow } from '@dos/types';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';

export class QiyasCertificationService {
  async getCertificationReadiness(schema: string, assessmentId: string) {
    const readiness = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
      `SELECT * FROM "${schema}".qiyas_certification_readiness WHERE qiyas_assessment_id = $1::uuid`,
      [assessmentId]
    ), { operation: 'query qiyas_certification_readiness' });

    const gaps = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
      `SELECT * FROM "${schema}".qiyas_certification_gaps WHERE readiness_id IN (
         SELECT readiness_id FROM "${schema}".qiyas_certification_readiness WHERE qiyas_assessment_id = $1::uuid
       ) ORDER BY priority ASC`,
      [assessmentId]
    ), { operation: 'query qiyas_certification_readiness' });

    return { readiness: readiness.rows, gaps: gaps.rows };
  }

  /** Update the status (and optional evidence reference) of a certification gap */
  async updateCertificationGapStatus(schema: string, gapId: string, status: string, evidence?: string): Promise<unknown> {
    try {
      const result = await safeQuery(
        `UPDATE "${schema}".qiyas_certification_gaps
         SET status = $2, evidence_reference = COALESCE($3, evidence_reference), updated_at = NOW()
         WHERE gap_id = $1::uuid
         RETURNING *`,
        [gapId, status, evidence || null]
      );
      return result.rows[0] ?? null;
    } catch (err: unknown) {
      logger.error(`[QiyasCertificationService] updateCertificationGapStatus failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }

  /** Compute certification readiness score = closed_gaps / total_gaps * 100 */
  async computeCertificationReadiness(schema: string, assessmentId: string): Promise<unknown> {
    try {
      // Get the readiness record(s) for this assessment
      const readinessResult = await safeQuery(
        `SELECT * FROM "${schema}".qiyas_certification_readiness WHERE qiyas_assessment_id = $1::uuid`,
        [assessmentId]
      );

      const readinessRecords = readinessResult.rows;
      const results: unknown[] = [];

      for (const readiness of readinessRecords) {
        const gapsResult = await safeQuery(
          `SELECT
             COUNT(*)::int AS total_gaps,
             COUNT(*) FILTER (WHERE status = 'closed')::int AS closed_gaps
           FROM "${schema}".qiyas_certification_gaps
           WHERE readiness_id = $1::uuid`,
          [readiness.readiness_id]
        );

        const totalGaps = gapsResult.rows[0]?.total_gaps || 0;
        const closedGaps = gapsResult.rows[0]?.closed_gaps || 0;
        const readinessScore = totalGaps > 0
          ? Math.round((closedGaps / totalGaps) * 10000) / 100
          : 100;

        // Update the readiness record with computed score
        await safeQuery(
          `UPDATE "${schema}".qiyas_certification_readiness
           SET readiness_score = $1, updated_at = NOW()
           WHERE readiness_id = $2::uuid`,
          [readinessScore, readiness.readiness_id]
        ).catch(catchHandler(EC.EVENT_BUS, {}));

        results.push({
          readinessId: readiness.readiness_id,
          totalGaps,
          closedGaps,
          readinessScore,
          isReady: closedGaps === totalGaps && totalGaps > 0,
        });
      }

      return results;
    } catch (err: unknown) {
      logger.error(`[QiyasCertificationService] computeCertificationReadiness failed: ${toErrorMessage(err)}`);
      throw err;
    }
  }
}
