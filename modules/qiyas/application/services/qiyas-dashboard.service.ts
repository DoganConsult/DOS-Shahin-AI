/**
 * Qiyas Dashboard service.
 * Provides aggregate summary data for the Qiyas module dashboard.
 */
import { emptyResult, query } from '../../ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

export class QiyasDashboardService {
  async getDashboardSummary(schema: string) {
    const modelsCount = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*) AS cnt FROM "${schema}".qiyas_models WHERE status = 'active'`), { operation: 'query qiyas_models' });
    const assessmentsCount = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*) AS cnt FROM "${schema}".qiyas_assessments`), { operation: 'query qiyas_models' });
    const inProgressCount = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*) AS cnt FROM "${schema}".qiyas_assessments WHERE status = 'in_progress'`), { operation: 'query qiyas_models' });
    const finalizedCount = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`SELECT COUNT(*) AS cnt FROM "${schema}".qiyas_assessments WHERE status = 'finalized'`), { operation: 'query qiyas_assessments' });

    const recentAssessments = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
      `SELECT a.qiyas_assessment_id, a.title_en, a.status, a.created_at, m.name_en AS model_name
       FROM "${schema}".qiyas_assessments a
       LEFT JOIN "${schema}".qiyas_models m ON m.model_id = a.model_id
       ORDER BY a.created_at DESC LIMIT 5`
    ), { operation: 'query qiyas_assessments' });

    return {
      totalModels: parseInt((modelsCount as any).rows[0]?.cnt ?? '0', 10),
      totalAssessments: parseInt((assessmentsCount as any).rows[0]?.cnt ?? '0', 10),
      inProgress: parseInt((inProgressCount as any).rows[0]?.cnt ?? '0', 10),
      finalized: parseInt((finalizedCount as any).rows[0]?.cnt ?? '0', 10),
      recentAssessments: recentAssessments.rows,
    };
  }
}
