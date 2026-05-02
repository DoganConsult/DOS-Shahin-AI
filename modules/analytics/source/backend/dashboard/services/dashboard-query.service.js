"use strict";
// ============================================
// Shahin — Dashboard Query Service
// Unified entry point for all widget data queries
// Tenant isolation, parallel execution, caching
// ============================================
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
exports.invalidateCache = invalidateCache;
exports.queryWidgetData = queryWidgetData;
exports.queryBatchWidgetData = queryBatchWidgetData;
// In-memory cache (production would use Redis)
const cache = new Map();
const CACHE_TTL_MS = 60000; // 60 seconds
function cacheKey(tenantId, widgetId, filters) {
    return `${tenantId}:${widgetId}:${JSON.stringify(filters || {})}`;
}
function getCached(key) {
    const entry = cache.get(key);
    if (!entry)
        return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}
function setCache(key, data) {
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}
function invalidateCache(tenantId) {
    for (const key of cache.keys()) {
        if (key.startsWith(`${tenantId}:`))
            cache.delete(key);
    }
}
const widgetData = __importStar(require("./widget-data.service"));
const insight = __importStar(require("../modules/widgets/insight-widgets.service"));
// Widget ID → data fetcher mapping
// Covers ALL widget IDs referenced in composed dashboard templates (dashboard-composer.service.ts)
const widgetFetchers = {
    // ── Insight widgets (29 DB-backed) ──
    'zombie-controls': insight.zombieControls,
    'year-in-grc': insight.yearInGrc,
    'untested-assumptions': insight.untestedAssumptions,
    'silent-controls': insight.silentControls,
    'root-cause-vs-patch': insight.rootCauseVsPatch,
    'risk-gravity': insight.riskGravity,
    'risk-denial': insight.riskDenial,
    'reputation-impact': insight.reputationImpact,
    'regulator-lens': insight.regulatorLens,
    'org-amnesia': insight.orgAmnesia,
    'one-sentence-truth': insight.oneSentenceTruth,
    'momentum-indicator': insight.momentumIndicator,
    'lifecycle-bottleneck': insight.lifecycleBottleneck,
    'knowledge-in-people': insight.knowledgeInPeople,
    'improvement-illusion': insight.improvementIllusion,
    'if-nothing-changes': insight.ifNothingChanges,
    'maturity-gap': insight.maturityGap,
    'future-you': insight.futureYou,
    'grc-time-loop': insight.grcTimeLoop,
    'false-comfort': insight.falseComfort,
    'evidence-rot': insight.evidenceRot,
    'decision-trace': insight.decisionTrace,
    'cultural-drift': insight.culturalDrift,
    'control-aging': insight.controlAging,
    'change-leverage': insight.changeLeverage,
    'breaking-the-cycle': insight.breakingTheCycle,
    'board-reality': insight.boardReality,
    'audit-dejavu': insight.auditDejavu,
    'assessment-honesty': insight.assessmentHonesty,
    // ── Risk widgets ──
    'risk-heatmap-echart': widgetData.getRiskHeatmapData,
    'risk-heatmap': widgetData.getRiskHeatmapData,
    'top-risks-echart': widgetData.getRiskHeatmapData,
    'risk-summary': widgetData.getRiskHeatmapData,
    'risk-distribution': widgetData.getRiskHeatmapData,
    'risk-constellation': widgetData.getRiskHeatmapData,
    'blast-radius': widgetData.getRiskHeatmapData,
    'monte-carlo-distribution': widgetData.getRiskHeatmapData,
    'tornado-sensitivity': widgetData.getRiskHeatmapData,
    'risk-bridge-waterfall': widgetData.getRiskHeatmapData,
    'red-team-board': widgetData.getRiskHeatmapData,
    // ── Compliance / trend widgets ──
    'trend-line-echart': widgetData.getComplianceTrendData,
    'compliance-gauge-echart': widgetData.getComplianceTrendData,
    'sparkline-echart': widgetData.getComplianceTrendData,
    'kpi-card-echart': widgetData.getComplianceTrendData,
    'ai-insights-echart': widgetData.getComplianceTrendData,
    'framework-compliance': widgetData.getComplianceTrendData,
    'comment-activity': widgetData.getComplianceTrendData,
    'compliance-heatmap-cc': widgetData.getComplianceTrendData,
    'compliance-coverage-treemap': widgetData.getComplianceTrendData,
    'control-testing-donut': widgetData.getComplianceTrendData,
    'rolling-forecast': widgetData.getComplianceTrendData,
    'compliance-score': widgetData.getComplianceTrendData,
    'compliance-trend': widgetData.getComplianceTrendData,
    'kpi-tiles-animated': widgetData.getComplianceTrendData,
    'bullet-chart-echart': widgetData.getComplianceTrendData,
    'd3-gauge': widgetData.getComplianceTrendData,
    'd3-progress-ring': widgetData.getComplianceTrendData,
    'animated-ranking-echart': widgetData.getComplianceTrendData,
    'grc-pulse-river': widgetData.getComplianceTrendData,
    'chart-carousel': widgetData.getComplianceTrendData,
    'ninety-day-timeline': widgetData.getComplianceTrendData,
    'engagement-pulse': widgetData.getComplianceTrendData,
    // ── Vendor widgets ──
    'vendor-bubble-echart': widgetData.getVendorBubbleData,
    'vendor-risk': widgetData.getVendorBubbleData,
    'vendor-risk-bubble-enhanced': widgetData.getVendorBubbleData,
    // ── Maturity / radar widgets ──
    'maturity-radar-echart': widgetData.getMaturityRadarData,
    'framework-radar': widgetData.getMaturityRadarData,
    'framework-radar-echart': widgetData.getMaturityRadarData,
    'maturity-spider': widgetData.getMaturityRadarData,
    'framework-coverage': widgetData.getMaturityRadarData,
    // ── Findings widgets ──
    'findings-bar-echart': widgetData.getFindingsBarData,
    'findings-funnel': widgetData.getFindingsBarData,
    'audit-findings-heatmap': widgetData.getFindingsBarData,
    // ── Evidence widgets ──
    'evidence-donut-echart': widgetData.getEvidenceDonutData,
    'audit-readiness-gauge': widgetData.getEvidenceDonutData,
    'evidence-locker': widgetData.getEvidenceDonutData,
    'evidence-flow-sankey': widgetData.getEvidenceDonutData,
    'remediation-velocity': widgetData.getEvidenceDonutData,
    // ── Control / sankey widgets ──
    'control-coverage-sankey': widgetData.getControlSankeyData,
    'control-progress': widgetData.getControlSankeyData,
    'control-effectiveness-boxplot': widgetData.getControlSankeyData,
    // ── Process / flow widgets ──
    'gantt-timeline': widgetData.getComplianceTrendData,
    'activity-feed': widgetData.getComplianceTrendData,
    'workflow-timeline-cc': widgetData.getComplianceTrendData,
    'process-flow': widgetData.getComplianceTrendData,
    'workflow-sankey': widgetData.getComplianceTrendData,
    // ── Advanced visualization widgets ──
    'parallel-coordinates': widgetData.getComplianceTrendData,
    'chord-diagram': widgetData.getControlSankeyData,
    'network-graph-enhanced': widgetData.getControlSankeyData,
    'entity-graph': widgetData.getControlSankeyData,
    'compliance-mesh-3d': widgetData.getComplianceTrendData,
    'evidence-globe-3d': widgetData.getEvidenceDonutData,
    'risk-surface-3d': widgetData.getRiskHeatmapData,
    // ── Incident / exception widgets ──
    'incident-tracker': widgetData.getFindingsBarData,
    'incident-seismograph': widgetData.getFindingsBarData,
    'bcp-status': widgetData.getComplianceTrendData,
    'anomaly-timeline': widgetData.getFindingsBarData,
};
async function queryWidgetData(tenantId, widgetId, filters) {
    const key = cacheKey(tenantId, widgetId, filters);
    // Check cache first
    const cached = getCached(key);
    if (cached) {
        return { success: true, data: cached, meta: { cached: true, generatedAt: new Date().toISOString() } };
    }
    const fetcher = widgetFetchers[widgetId];
    if (!fetcher) {
        return { success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString() } };
    }
    try {
        const data = await fetcher(tenantId);
        setCache(key, data);
        return { success: true, data, meta: { cached: false, generatedAt: new Date().toISOString() } };
    }
    catch (_err) {
        // Fallback to stale cache on error
        const stale = cache.get(key);
        if (stale) {
            return { success: true, data: stale.data, meta: { cached: true, generatedAt: new Date().toISOString() } };
        }
        return { success: false, data: null, meta: { cached: false, generatedAt: new Date().toISOString() } };
    }
}
async function queryBatchWidgetData(tenantId, widgetIds, filters) {
    const results = {};
    const promises = widgetIds.slice(0, 20).map(async (id) => {
        results[id] = await queryWidgetData(tenantId, id, filters);
    });
    await Promise.all(promises);
    return results;
}
//# sourceMappingURL=dashboard-query.service.js.map