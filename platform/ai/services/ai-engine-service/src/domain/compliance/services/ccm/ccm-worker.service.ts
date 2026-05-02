import { safeQuery, tenantSchema } from '@dos/db';

export async function runCCMCycle(tenantId: string): Promise<any> {
  const schema = tenantSchema(tenantId);
  const startedAt = new Date().toISOString();

  const [assessments, overdue, nonCompliant] = await Promise.all([
    safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${schema}".compliance_assessments WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{ total: 0 }] })),
    safeQuery(
      `SELECT COUNT(*)::int AS count FROM "${schema}".compliance_assessments
       WHERE due_date < NOW() AND status NOT IN ('compliant','closed','waived') AND deleted_at IS NULL`,
    ).catch(() => ({ rows: [{ count: 0 }] })),
    safeQuery(
      `SELECT COUNT(*)::int AS count FROM "${schema}".compliance_assessments
       WHERE status = 'non_compliant' AND deleted_at IS NULL`,
    ).catch(() => ({ rows: [{ count: 0 }] })),
  ]);

  const totalAssessments = Number(assessments.rows[0]?.total ?? 0);
  const overdueCount = Number(overdue.rows[0]?.count ?? 0);
  const nonCompliantCount = Number(nonCompliant.rows[0]?.count ?? 0);
  const completedAt = new Date().toISOString();

  return {
    cycleId: `ccm-${Date.now()}`,
    tenantId,
    startedAt,
    completedAt,
    summary: {
      totalAssessments,
      overdueCount,
      nonCompliantCount,
      healthScore: totalAssessments > 0
        ? Math.round(((totalAssessments - overdueCount - nonCompliantCount) / totalAssessments) * 100)
        : 100,
    },
    status: 'completed',
  };
}

export async function getCCMHistory(tenantId: string, limit = 50): Promise<any[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT metadata, created_at FROM "${schema}".governance_settings
     WHERE config_key LIKE 'ccm_cycle::%' AND is_active = TRUE
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  ).catch(() => ({ rows: [] }));
  return result.rows.map((row: any) => ({
    ...(typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata ?? {})),
    recordedAt: row.created_at,
  }));
}
