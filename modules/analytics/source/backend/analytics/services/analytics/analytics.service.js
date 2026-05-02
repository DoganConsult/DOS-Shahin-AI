"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeTenantHealthScore = exports.recalculateCompliancePostureIncremental = exports.projectKPI = exports.linearRegression = exports.getBenchmarkData = exports.getKPITrends = exports.runAggregationJob = exports.deserializeDashboardConfig = exports.serializeDashboardConfig = exports.getDashboardConfig = exports.saveDashboardConfig = exports.computeKPIs = void 0;
// KPI computation
var analytics_kpi_service_1 = require("./analytics-kpi.service");
Object.defineProperty(exports, "computeKPIs", { enumerable: true, get: function () { return analytics_kpi_service_1.computeKPIs; } });
// Dashboard configuration & serialization
var analytics_dashboard_service_1 = require("./analytics-dashboard.service");
Object.defineProperty(exports, "saveDashboardConfig", { enumerable: true, get: function () { return analytics_dashboard_service_1.saveDashboardConfig; } });
Object.defineProperty(exports, "getDashboardConfig", { enumerable: true, get: function () { return analytics_dashboard_service_1.getDashboardConfig; } });
Object.defineProperty(exports, "serializeDashboardConfig", { enumerable: true, get: function () { return analytics_dashboard_service_1.serializeDashboardConfig; } });
Object.defineProperty(exports, "deserializeDashboardConfig", { enumerable: true, get: function () { return analytics_dashboard_service_1.deserializeDashboardConfig; } });
// KPI aggregation & trends
var analytics_trends_service_1 = require("./analytics-trends.service");
Object.defineProperty(exports, "runAggregationJob", { enumerable: true, get: function () { return analytics_trends_service_1.runAggregationJob; } });
Object.defineProperty(exports, "getKPITrends", { enumerable: true, get: function () { return analytics_trends_service_1.getKPITrends; } });
// Benchmarking, linear regression & projection
var analytics_benchmarking_service_1 = require("./analytics-benchmarking.service");
Object.defineProperty(exports, "getBenchmarkData", { enumerable: true, get: function () { return analytics_benchmarking_service_1.getBenchmarkData; } });
Object.defineProperty(exports, "linearRegression", { enumerable: true, get: function () { return analytics_benchmarking_service_1.linearRegression; } });
Object.defineProperty(exports, "projectKPI", { enumerable: true, get: function () { return analytics_benchmarking_service_1.projectKPI; } });
// Incremental compliance posture
var analytics_compliance_service_1 = require("./analytics-compliance.service");
Object.defineProperty(exports, "recalculateCompliancePostureIncremental", { enumerable: true, get: function () { return analytics_compliance_service_1.recalculateCompliancePostureIncremental; } });
// Tenant health score
var analytics_health_service_1 = require("./analytics-health.service");
Object.defineProperty(exports, "computeTenantHealthScore", { enumerable: true, get: function () { return analytics_health_service_1.computeTenantHealthScore; } });
//# sourceMappingURL=analytics.service.js.map