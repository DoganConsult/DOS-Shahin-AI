import * as composer from '../../../modules/dashboard/source/backend/dashboard/services/dashboard-composer.service';
import * as zones from '../../../modules/dashboard/source/backend/dashboard/services/dashboard-zones.service';
export declare class DashboardService {
    resolveDefault(ctx: {
        userId: string;
        tenantId: string;
    }): Promise<{}>;
    listAllowedDashboards(_ctx: {
        userId: string;
        tenantId: string;
    }): Promise<composer.DashboardCatalogEntry[]>;
    getDashboard(ctx: {
        userId: string;
        tenantId: string;
        dashboardCode: string;
    }): Promise<composer.DashboardLayout>;
    list(_tenantId?: string): Promise<composer.DashboardCatalogEntry[]>;
    getById(_tenantId: string, code: string): Promise<composer.DashboardLayout>;
    create(tenantId: string, userId: string, code: string, layout: unknown): Promise<{
        code: string;
    }>;
    update(tenantId: string, userId: string, code: string, layout: unknown): Promise<{
        code: string;
    }>;
    remove(_tenantId: string, _code: string): Promise<void>;
    getWidgetData(tenantId: string, widgetId: string, filters?: Record<string, unknown>): Promise<import("@dos/types").WidgetDataEnvelope>;
    getZones(tenantId: string, workspaceId: string, userId: string): Promise<{
        zoneA: zones.ZoneAData;
        zoneB: zones.ZoneBData;
        zoneC: zones.ZoneCData;
        zoneD: zones.ZoneDData;
    }>;
}
