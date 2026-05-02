import { safeQuery, tenantSchema } from '../ports/database.port';

export interface DiagnosticsCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface DiagnosticsResult {
  moduleCode: string;
  healthy: boolean;
  checks: DiagnosticsCheck[];
  checkedAt: string;
}

export class WidgetDiagnosticsService {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  async runDiagnostics(): Promise<DiagnosticsResult> {
    const checks: DiagnosticsCheck[] = [];

    const [schemaCheck, registryCheck, bundleCheck, renderLogCheck, depCheck] = await Promise.all([
      this.checkSchemaExists(),
      this.checkRegistryTable(),
      this.checkBundleTable(),
      this.checkRenderLogTable(),
      this.checkDependencyTables(),
    ]);

    checks.push(schemaCheck, registryCheck, bundleCheck, renderLogCheck, ...depCheck);

    return {
      moduleCode: 'widgets',
      healthy: checks.every(c => c.passed),
      checks,
      checkedAt: new Date().toISOString(),
    };
  }

  async runRenderDiagnostics(): Promise<DiagnosticsCheck[]> {
    const checks: DiagnosticsCheck[] = [];

    const renderStats = await safeQuery(`
      SELECT
        COUNT(*)::int AS total_renders,
        COUNT(*) FILTER (WHERE NOT success)::int AS failed_renders,
        AVG(duration_ms)::int AS avg_duration_ms,
        MAX(duration_ms)::int AS max_duration_ms
      FROM "${this.schema}".widgets_render_log
      WHERE rendered_at > now() - interval '1 hour'
    `).catch(() => ({ rows: [{ total_renders: 0, failed_renders: 0, avg_duration_ms: 0, max_duration_ms: 0 }] }));

    const stats = renderStats.rows[0] || {};
    const errorRate = stats.total_renders > 0 ? stats.failed_renders / stats.total_renders : 0;

    checks.push({
      name: 'render_error_rate',
      passed: errorRate < 0.1,
      detail: `${(errorRate * 100).toFixed(1)}% error rate (${stats.failed_renders}/${stats.total_renders})`,
    });

    checks.push({
      name: 'render_latency',
      passed: (stats.avg_duration_ms || 0) < 2000,
      detail: `avg=${stats.avg_duration_ms}ms, max=${stats.max_duration_ms}ms`,
    });

    return checks;
  }

  async runPublicationDiagnostics(): Promise<DiagnosticsCheck[]> {
    const checks: DiagnosticsCheck[] = [];

    const staleCheck = await safeQuery(`
      SELECT COUNT(*)::int AS cnt
      FROM "${this.schema}".widgets_registry
      WHERE status = 'draft' AND created_at < now() - interval '30 days'
        AND deleted_at IS NULL
    `).catch(() => ({ rows: [{ cnt: 0 }] }));

    checks.push({
      name: 'stale_drafts',
      passed: (staleCheck.rows[0]?.cnt ?? 0) < 5,
      detail: `${staleCheck.rows[0]?.cnt ?? 0} widgets in draft > 30 days`,
    });

    const blockedCheck = await safeQuery(`
      SELECT COUNT(*)::int AS cnt
      FROM "${this.schema}".widgets_registry
      WHERE status = 'suspended' AND deleted_at IS NULL
    `).catch(() => ({ rows: [{ cnt: 0 }] }));

    checks.push({
      name: 'suspended_widgets',
      passed: (blockedCheck.rows[0]?.cnt ?? 0) === 0,
      detail: `${blockedCheck.rows[0]?.cnt ?? 0} suspended widgets`,
    });

    return checks;
  }

  private async checkSchemaExists(): Promise<DiagnosticsCheck> {
    const { rows } = await safeQuery(
      `SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`,
      [this.schema],
    ).catch(() => ({ rows: [] }));
    return { name: 'schema_exists', passed: rows.length > 0 };
  }

  private async checkRegistryTable(): Promise<DiagnosticsCheck> {
    const { rows } = await safeQuery(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'widgets_registry'`,
      [this.schema],
    ).catch(() => ({ rows: [] }));
    return { name: 'registry_table_exists', passed: rows.length > 0 };
  }

  private async checkBundleTable(): Promise<DiagnosticsCheck> {
    const { rows } = await safeQuery(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'widgets_bundles'`,
      [this.schema],
    ).catch(() => ({ rows: [] }));
    return { name: 'bundle_table_exists', passed: rows.length > 0 };
  }

  private async checkRenderLogTable(): Promise<DiagnosticsCheck> {
    const { rows } = await safeQuery(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'widgets_render_log'`,
      [this.schema],
    ).catch(() => ({ rows: [] }));
    return { name: 'render_log_table_exists', passed: rows.length > 0 };
  }

  private async checkDependencyTables(): Promise<DiagnosticsCheck[]> {
    const deps = ['risks', 'controls', 'findings', 'evidence', 'action_items', 'policies'];
    const checks: DiagnosticsCheck[] = [];

    for (const table of deps) {
      const { rows } = await safeQuery(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2`,
        [this.schema, table],
      ).catch(() => ({ rows: [] }));
      checks.push({ name: `dep_${table}`, passed: rows.length > 0 });
    }

    return checks;
  }
}

export async function runDiagnostics(tenantId: string): Promise<DiagnosticsResult> {
  const service = new WidgetDiagnosticsService(tenantId);
  return service.runDiagnostics();
}
