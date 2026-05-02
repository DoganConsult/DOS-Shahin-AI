"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const observability_1 = require("@dos/platform-core/observability");
const composer = __importStar(require("../../../modules/dashboard/source/backend/dashboard/services/dashboard-composer.service"));
const queryService = __importStar(require("../../../modules/dashboard/source/backend/dashboard/services/dashboard-query.service"));
const zones = __importStar(require("../../../modules/dashboard/source/backend/dashboard/services/dashboard-zones.service"));
class DashboardService {
    async resolveDefault(ctx) {
        try {
            const custom = await composer.loadCustomDashboard(ctx.tenantId, ctx.userId, 'default');
            return custom || composer.getDashboardLayout('tenant-overview') || {};
        }
        catch (err) {
            observability_1.logger.error('[DashboardService] resolveDefault failed:', err.message);
            return {};
        }
    }
    async listAllowedDashboards(_ctx) {
        return composer.getDashboardCatalog();
    }
    async getDashboard(ctx) {
        return composer.getDashboardLayout(ctx.dashboardCode) || null;
    }
    async list(_tenantId) {
        return composer.getDashboardCatalog();
    }
    async getById(_tenantId, code) {
        return composer.getDashboardLayout(code) || null;
    }
    async create(tenantId, userId, code, layout) {
        await composer.saveCustomDashboard(tenantId, userId, code, layout);
        return { code };
    }
    async update(tenantId, userId, code, layout) {
        await composer.saveCustomDashboard(tenantId, userId, code, layout);
        return { code };
    }
    async remove(_tenantId, _code) {
        // Custom dashboard deletion — no-op for system dashboards
    }
    async getWidgetData(tenantId, widgetId, filters) {
        return queryService.queryWidgetData(tenantId, widgetId, filters);
    }
    async getZones(tenantId, workspaceId, userId) {
        const [zoneA, zoneB, zoneC, zoneD] = await Promise.all([
            zones.getZoneA(tenantId, workspaceId, userId),
            zones.getZoneB(tenantId, workspaceId),
            zones.getZoneC(tenantId, workspaceId),
            zones.getZoneD(tenantId, workspaceId),
        ]);
        return { zoneA, zoneB, zoneC, zoneD };
    }
}
exports.DashboardService = DashboardService;
//# sourceMappingURL=dashboard.service.js.map