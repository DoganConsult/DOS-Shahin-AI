import { logger } from '@dos/platform-core/observability';
import * as composer from '../../../modules/dashboard/source/backend/dashboard/services/dashboard-composer.service';
import * as queryService from '../../../modules/dashboard/source/backend/dashboard/services/dashboard-query.service';
import * as zones from '../../../modules/dashboard/source/backend/dashboard/services/dashboard-zones.service';

export class DashboardService {
  async resolveDefault(ctx: { userId: string; tenantId: string }) {
    try {
      const custom = await composer.loadCustomDashboard(ctx.tenantId, ctx.userId, 'default');
      return custom || composer.getDashboardLayout('tenant-overview') || {};
    } catch (err) {
      logger.error('[DashboardService] resolveDefault failed:', (err as Error).message);
      return {};
    }
  }

  async listAllowedDashboards(_ctx: { userId: string; tenantId: string }) {
    return composer.getDashboardCatalog();
  }

  async getDashboard(ctx: { userId: string; tenantId: string; dashboardCode: string }) {
    return composer.getDashboardLayout(ctx.dashboardCode) || null;
  }

  async list(_tenantId?: string) {
    return composer.getDashboardCatalog();
  }

  async getById(_tenantId: string, code: string) {
    return composer.getDashboardLayout(code) || null;
  }

  async create(tenantId: string, userId: string, code: string, layout: unknown) {
    await composer.saveCustomDashboard(tenantId, userId, code, layout as any);
    return { code };
  }

  async update(tenantId: string, userId: string, code: string, layout: unknown) {
    await composer.saveCustomDashboard(tenantId, userId, code, layout as any);
    return { code };
  }

  async remove(_tenantId: string, _code: string): Promise<void> {
    // Custom dashboard deletion — no-op for system dashboards
  }

  async getWidgetData(tenantId: string, widgetId: string, filters?: Record<string, unknown>) {
    return queryService.queryWidgetData(tenantId, widgetId, filters);
  }

  async getZones(tenantId: string, workspaceId: string, userId: string) {
    const [zoneA, zoneB, zoneC, zoneD] = await Promise.all([
      zones.getZoneA(tenantId, workspaceId, userId),
      zones.getZoneB(tenantId, workspaceId),
      zones.getZoneC(tenantId, workspaceId),
      zones.getZoneD(tenantId, workspaceId),
    ]);
    return { zoneA, zoneB, zoneC, zoneD };
  }
}
