import { safeQuery, tenantSchema } from '../ports/database.port';
import { ExceptionDiagnosticsService } from '../diagnostics/exception-diagnostics.service';
import { ExceptionDashboardService } from './exception-dashboard.service';
import { EXCEPTION_LIMITS, EXCEPTION_TIMEOUTS, EXCEPTION_BUSINESS_THRESHOLDS } from '../data/exception-constants';

export interface ExceptionAdminOverview {
  moduleCode: string;
  tenantId: string;
  generatedAt: string;
  health: string;
  diagnostics: Awaited<ReturnType<ExceptionDiagnosticsService['runDiagnostics']>>;
  dashboard: Awaited<ReturnType<ExceptionDashboardService['getDashboardSummary']>>;
  config: { limits: typeof EXCEPTION_LIMITS; timeouts: typeof EXCEPTION_TIMEOUTS; thresholds: typeof EXCEPTION_BUSINESS_THRESHOLDS };
}

export class ExceptionAdminService {
  private diagnosticsService = new ExceptionDiagnosticsService();
  private dashboardService = new ExceptionDashboardService();

  async getAdminOverview(tenantId: string): Promise<ExceptionAdminOverview> {
    const [diagnostics, dashboard] = await Promise.all([
      this.diagnosticsService.runDiagnostics(tenantId),
      this.dashboardService.getDashboardSummary(tenantId),
    ]);

    return {
      moduleCode: 'exception',
      tenantId,
      generatedAt: new Date().toISOString(),
      health: diagnostics.overallHealth,
      diagnostics,
      dashboard,
      config: { limits: EXCEPTION_LIMITS, timeouts: EXCEPTION_TIMEOUTS, thresholds: EXCEPTION_BUSINESS_THRESHOLDS },
    };
  }

  async getModuleStats(tenantId: string): Promise<Record<string, number>> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS drafts,
         COUNT(*) FILTER (WHERE status = 'pending' OR status = 'submitted')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'approved' OR status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'expired')::int AS expired,
         COUNT(*) FILTER (WHERE status = 'revoked')::int AS revoked
       FROM "${schema}".exceptions WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] }));
    return result.rows[0] || {};
  }
}
