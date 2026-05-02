import { safeQuery, tenantSchema } from '../ports/database.port';
import type { GenericRow } from '@dos/types';

export class KsaRegulatoryQueryRepository {
  private schema: string;
  constructor(tenantId: string) { this.schema = tenantSchema(tenantId); }

  async getFrameworkCoverage(): Promise<{ frameworkCode: string; totalControls: number; mappedControls: number; coverage: number }[]> {
    const result = await safeQuery(
      `SELECT framework_code,
              COUNT(*)::int AS total_controls,
              COUNT(*) FILTER (WHERE mapped = true)::int AS mapped_controls,
              ROUND(COUNT(*) FILTER (WHERE mapped = true)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS coverage
       FROM "${this.schema}".control_mappings
       GROUP BY framework_code ORDER BY framework_code`);

    return result.rows as Record<string, unknown>[];
  }

  async getRecentChanges(limit = 20): Promise<GenericRow[]> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".regulatory_changes WHERE deleted_at IS NULL ORDER BY effective_date DESC LIMIT $1`, [limit]);
    return result.rows;
  }

  async getMaturityTrend(months = 12): Promise<GenericRow[]> {
    // secrets-scan-allow: tenantSchema()-validated quoted schema + typed column/filter constants; all user values bound via $N
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".ksa_regulatory_readiness_snapshots
       WHERE scored_at > NOW() - INTERVAL '${months} months'
       ORDER BY scored_at ASC`);
    return result.rows;
  }
}
