import { ExecutiveWidgetsRepo } from './executive-widgets.repo';

export class ExecutiveWidgetsService {
  private repo = new ExecutiveWidgetsRepo();

  async getSummary(tenantId: string) {
    const schema = await this.repo.resolveTenantSchema(tenantId);

    const [
      staleControlsCount,
      overdueRemediationCount,
      policyReviewDebtCount,
      latestEngineRun,
    ] = await Promise.all([
      this.repo.getStaleControlsCount(schema),
      this.repo.getOverdueRemediationCount(schema),
      this.repo.getPolicyReviewDebtCount(schema),
      this.repo.getLatestEngineRun(schema),
    ]);

    return {
      staleControlsCount,
      overdueRemediationCount,
      policyReviewDebtCount,
      latestEngineRun: latestEngineRun
        ? {
            runId: latestEngineRun.run_id,
            status: latestEngineRun.status,
            startedAt: latestEngineRun.started_at,
            completedAt: latestEngineRun.completed_at,
            staleControls: latestEngineRun.stale_controls ?? 0,
            overdueRemediations: latestEngineRun.overdue_remediations ?? 0,
            kriBreaches: latestEngineRun.kri_breaches ?? 0,
            policyReviewsStarted: latestEngineRun.policy_reviews_started ?? 0,
            tasksCreated: latestEngineRun.tasks_created ?? 0,
            notificationsCreated: latestEngineRun.notifications_created ?? 0,
            escalationsTriggered: latestEngineRun.escalations_triggered ?? 0,
          }
        : null,
    };
  }

  async getTopBreachedKris(tenantId: string, limit = 10) {
    const schema = await this.repo.resolveTenantSchema(tenantId);
    return this.repo.getTopBreachedKris(schema, limit);
  }

  async getPolicyReviewDebt(tenantId: string, limit = 10) {
    const schema = await this.repo.resolveTenantSchema(tenantId);
    return this.repo.getPolicyReviewDebt(schema, limit);
  }

  async getEngineTrend(tenantId: string, limit = 12) {
    const schema = await this.repo.resolveTenantSchema(tenantId);
    return this.repo.getEngineTrend(schema, limit);
  }
}
