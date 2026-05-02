"use strict";
// ============================================
// Shahin GRC — Context-Aware Dashboard Composer
// Builds dashboards based on role, module, scenario, org status
// NO MOCK DATA — All queries hit actual tenant schemas
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContextualDashboard = buildContextualDashboard;
// ── Context-Aware Dashboard Builder ───────────────────────────────────────────
/**
 * Build dashboard based on context (role, module, scenario, org status)
 */
async function buildContextualDashboard(ctx) {
    const widgets = [];
    // Base widgets for all roles
    widgets.push(...getBaseWidgets(ctx));
    // Role-specific widgets
    widgets.push(...getRoleSpecificWidgets(ctx));
    // Module-specific widgets
    if (ctx.moduleCode) {
        widgets.push(...getModuleSpecificWidgets(ctx));
    }
    // Scenario-specific widgets
    if (ctx.scenario) {
        widgets.push(...getScenarioSpecificWidgets(ctx));
    }
    // Org status-specific widgets
    widgets.push(...getOrgStatusSpecificWidgets(ctx));
    // Maturity-specific widgets
    if (ctx.orgMaturity) {
        widgets.push(...getMaturitySpecificWidgets(ctx));
    }
    // Sort by priority (highest first), then by required flags
    widgets.sort((a, b) => {
        if (a.requiredForRole && !b.requiredForRole)
            return -1;
        if (!a.requiredForRole && b.requiredForRole)
            return 1;
        if (a.requiredForScenario && !b.requiredForScenario)
            return -1;
        if (!a.requiredForScenario && b.requiredForScenario)
            return 1;
        return b.priority - a.priority;
    });
    // Layout widgets in grid (auto-positioning)
    const layout = autoLayoutWidgets(widgets);
    return {
        dashboardCode: `dashboard_${ctx.roleCode}_${ctx.moduleCode || 'all'}_${ctx.scenario || 'default'}`,
        title: getDashboardTitle(ctx),
        titleAr: getDashboardTitleAr(ctx),
        widgets: layout,
        layout: {
            columns: 12,
            rowHeight: 60,
        },
        metadata: {
            context: ctx,
            generatedAt: new Date().toISOString(),
            widgetCount: widgets.length,
        },
    };
}
// ── Widget Selection by Context ───────────────────────────────────────────────
function getBaseWidgets(ctx) {
    return [
        {
            widgetId: 'executive-summary',
            widgetKey: 'executive-summary-widget',
            componentKey: 'executive-summary-widget',
            title: 'Executive Summary',
            titleAr: 'الملخص التنفيذي',
            x: 0,
            y: 0,
            w: 12,
            h: 2,
            config: {},
            priority: 100,
            requiredForRole: ctx.roleCode === 'executive_owner' || ctx.roleCode === 'platform_admin',
            requiredForScenario: ctx.scenario === 'executive',
        },
    ];
}
function getRoleSpecificWidgets(ctx) {
    const widgets = [];
    switch (ctx.roleCode) {
        case 'risk_owner':
            widgets.push({
                widgetId: 'advanced-risk-heatmap',
                widgetKey: 'advanced-risk-heatmap',
                componentKey: 'risk-heatmap-widget',
                title: 'Risk Heatmap',
                titleAr: 'خريطة المخاطر',
                x: 0,
                y: 0,
                w: 8,
                h: 4,
                config: { drillThrough: true },
                priority: 90,
                requiredForRole: true,
                requiredForScenario: false,
            }, {
                widgetId: 'top-risks',
                widgetKey: 'top-risks-widget',
                componentKey: 'recommendations-widget',
                title: 'Top Risks',
                titleAr: 'أهم المخاطر',
                x: 8,
                y: 0,
                w: 4,
                h: 4,
                config: { limit: 10 },
                priority: 85,
                requiredForRole: true,
                requiredForScenario: false,
            });
            break;
        case 'compliance_officer':
        case 'grc_manager':
            widgets.push({
                widgetId: 'advanced-compliance-analytics',
                widgetKey: 'advanced-compliance-analytics',
                componentKey: 'maturity-score-widget',
                title: 'Compliance Analytics',
                titleAr: 'تحليلات الامتثال',
                x: 0,
                y: 0,
                w: 12,
                h: 4,
                config: { drillThrough: true },
                priority: 90,
                requiredForRole: true,
                requiredForScenario: false,
            }, {
                widgetId: 'framework-coverage',
                widgetKey: 'framework-coverage-widget',
                componentKey: 'evidence-coverage-widget',
                title: 'Framework Coverage',
                titleAr: 'تغطية الأطر',
                x: 0,
                y: 4,
                w: 6,
                h: 3,
                config: {},
                priority: 80,
                requiredForRole: false,
                requiredForScenario: false,
            }, {
                widgetId: 'control-status',
                widgetKey: 'control-status-widget',
                componentKey: 'assessment-progress-widget',
                title: 'Control Status',
                titleAr: 'حالة الضوابط',
                x: 6,
                y: 4,
                w: 6,
                h: 3,
                config: {},
                priority: 80,
                requiredForRole: false,
                requiredForScenario: false,
            });
            break;
        case 'control_owner':
            widgets.push({
                widgetId: 'my-controls',
                widgetKey: 'my-controls-widget',
                componentKey: 'overdue-actions-widget',
                title: 'My Controls',
                titleAr: 'ضوابطي',
                x: 0,
                y: 0,
                w: 6,
                h: 3,
                config: { assignedTo: ctx.roleCode },
                priority: 90,
                requiredForRole: true,
                requiredForScenario: false,
            }, {
                widgetId: 'evidence-tasks',
                widgetKey: 'evidence-tasks-widget',
                componentKey: 'overdue-actions-widget',
                title: 'Evidence Tasks',
                titleAr: 'مهام الأدلة',
                x: 6,
                y: 0,
                w: 6,
                h: 3,
                config: { assignedTo: ctx.roleCode },
                priority: 85,
                requiredForRole: true,
                requiredForScenario: false,
            });
            break;
        case 'auditor':
            widgets.push({
                widgetId: 'audit-exposure',
                widgetKey: 'audit-exposure-widget',
                componentKey: 'audit-exposure-widget',
                title: 'Audit Exposure',
                titleAr: 'التعرض للتدقيق',
                x: 0,
                y: 0,
                w: 12,
                h: 4,
                config: { readOnly: true },
                priority: 90,
                requiredForRole: true,
                requiredForScenario: false,
            }, {
                widgetId: 'findings-summary',
                widgetKey: 'findings-summary-widget',
                componentKey: 'recommendations-widget',
                title: 'Findings Summary',
                titleAr: 'ملخص النتائج',
                x: 0,
                y: 4,
                w: 6,
                h: 3,
                config: {},
                priority: 85,
                requiredForRole: false,
                requiredForScenario: false,
            });
            break;
        default:
            // Viewer or any role - minimal widgets
            widgets.push({
                widgetId: 'dashboard-summary',
                widgetKey: 'dashboard-summary-widget',
                componentKey: 'executive-summary-widget',
                title: 'Dashboard Summary',
                titleAr: 'ملخص لوحة المعلومات',
                x: 0,
                y: 0,
                w: 12,
                h: 2,
                config: { readOnly: true },
                priority: 50,
                requiredForRole: false,
                requiredForScenario: false,
            });
    }
    return widgets;
}
function getModuleSpecificWidgets(ctx) {
    const widgets = [];
    switch (ctx.moduleCode) {
        case 'risk':
            widgets.push({
                widgetId: 'advanced-risk-heatmap',
                widgetKey: 'advanced-risk-heatmap',
                componentKey: 'risk-heatmap-widget',
                title: 'Risk Analytics',
                titleAr: 'تحليلات المخاطر',
                x: 0,
                y: 0,
                w: 12,
                h: 5,
                config: { drillThrough: true, predictive: true },
                priority: 95,
                requiredForRole: false,
                requiredForScenario: false,
            }, {
                widgetId: 'risk-trends',
                widgetKey: 'risk-trends-widget',
                componentKey: 'engine-trend-widget',
                title: 'Risk Trends',
                titleAr: 'اتجاهات المخاطر',
                x: 0,
                y: 5,
                w: 6,
                h: 3,
                config: {},
                priority: 80,
                requiredForRole: false,
                requiredForScenario: false,
            }, {
                widgetId: 'kri-status',
                widgetKey: 'kri-status-widget',
                componentKey: 'kri-status-widget',
                title: 'KRI Status',
                titleAr: 'حالة مؤشرات المخاطر الرئيسية',
                x: 6,
                y: 5,
                w: 6,
                h: 3,
                config: {},
                priority: 80,
                requiredForRole: false,
                requiredForScenario: false,
            });
            break;
        case 'compliance':
            widgets.push({
                widgetId: 'advanced-compliance-analytics',
                widgetKey: 'advanced-compliance-analytics',
                componentKey: 'maturity-score-widget',
                title: 'Compliance Analytics',
                titleAr: 'تحليلات الامتثال',
                x: 0,
                y: 0,
                w: 12,
                h: 5,
                config: { drillThrough: true, predictive: true },
                priority: 95,
                requiredForRole: false,
                requiredForScenario: false,
            }, {
                widgetId: 'framework-scores',
                widgetKey: 'framework-scores-widget',
                componentKey: 'maturity-score-widget',
                title: 'Framework Scores',
                titleAr: 'درجات الأطر',
                x: 0,
                y: 5,
                w: 6,
                h: 3,
                config: {},
                priority: 80,
                requiredForRole: false,
                requiredForScenario: false,
            }, {
                widgetId: 'control-coverage',
                widgetKey: 'control-coverage-widget',
                componentKey: 'evidence-coverage-widget',
                title: 'Control Coverage',
                titleAr: 'تغطية الضوابط',
                x: 6,
                y: 5,
                w: 6,
                h: 3,
                config: {},
                priority: 80,
                requiredForRole: false,
                requiredForScenario: false,
            });
            break;
        case 'evidence':
            widgets.push({
                widgetId: 'advanced-evidence-analytics',
                widgetKey: 'advanced-evidence-analytics',
                componentKey: 'evidence-coverage-widget',
                title: 'Evidence Analytics',
                titleAr: 'تحليلات الأدلة',
                x: 0,
                y: 0,
                w: 12,
                h: 5,
                config: { drillThrough: true, predictive: true },
                priority: 95,
                requiredForRole: false,
                requiredForScenario: false,
            }, {
                widgetId: 'evidence-expiry',
                widgetKey: 'evidence-expiry-widget',
                componentKey: 'policy-review-debt-widget',
                title: 'Evidence Expiry',
                titleAr: 'انتهاء الأدلة',
                x: 0,
                y: 5,
                w: 6,
                h: 3,
                config: {},
                priority: 85,
                requiredForRole: false,
                requiredForScenario: false,
            }, {
                widgetId: 'evidence-coverage',
                widgetKey: 'evidence-coverage-widget',
                componentKey: 'evidence-coverage-widget',
                title: 'Coverage by Domain',
                titleAr: 'التغطية حسب المجال',
                x: 6,
                y: 5,
                w: 6,
                h: 3,
                config: {},
                priority: 80,
                requiredForRole: false,
                requiredForScenario: false,
            });
            break;
        case 'workflow':
            widgets.push({
                widgetId: 'advanced-workflow-analytics',
                widgetKey: 'advanced-workflow-analytics',
                componentKey: 'overdue-actions-widget',
                title: 'Workflow Analytics',
                titleAr: 'تحليلات سير العمل',
                x: 0,
                y: 0,
                w: 12,
                h: 5,
                config: { drillThrough: true, predictive: true },
                priority: 95,
                requiredForRole: false,
                requiredForScenario: false,
            }, {
                widgetId: 'sla-status',
                widgetKey: 'sla-status-widget',
                componentKey: 'kri-status-widget',
                title: 'SLA Status',
                titleAr: 'حالة SLA',
                x: 0,
                y: 5,
                w: 6,
                h: 3,
                config: {},
                priority: 85,
                requiredForRole: false,
                requiredForScenario: false,
            }, {
                widgetId: 'approval-queue',
                widgetKey: 'approval-queue-widget',
                componentKey: 'overdue-actions-widget',
                title: 'Approval Queue',
                titleAr: 'قائمة الموافقات',
                x: 6,
                y: 5,
                w: 6,
                h: 3,
                config: {},
                priority: 80,
                requiredForRole: false,
                requiredForScenario: false,
            });
            break;
    }
    return widgets;
}
function getScenarioSpecificWidgets(ctx) {
    const widgets = [];
    switch (ctx.scenario) {
        case 'baseline':
            widgets.push({
                widgetId: 'baseline-assessment',
                widgetKey: 'baseline-assessment-widget',
                componentKey: 'assessment-progress-widget',
                title: 'Baseline Assessment',
                titleAr: 'تقييم الأساس',
                x: 0,
                y: 0,
                w: 12,
                h: 4,
                config: { scenario: 'baseline' },
                priority: 95,
                requiredForRole: false,
                requiredForScenario: true,
            });
            break;
        case 'assessment':
            widgets.push({
                widgetId: 'assessment-progress',
                widgetKey: 'assessment-progress-widget',
                componentKey: 'assessment-progress-widget',
                title: 'Assessment Progress',
                titleAr: 'تقدم التقييم',
                x: 0,
                y: 0,
                w: 6,
                h: 4,
                config: { scenario: 'assessment' },
                priority: 95,
                requiredForRole: false,
                requiredForScenario: true,
            }, {
                widgetId: 'assessment-findings',
                widgetKey: 'assessment-findings-widget',
                componentKey: 'recommendations-widget',
                title: 'Assessment Findings',
                titleAr: 'نتائج التقييم',
                x: 6,
                y: 0,
                w: 6,
                h: 4,
                config: {},
                priority: 90,
                requiredForRole: false,
                requiredForScenario: false,
            });
            break;
        case 'remediation':
            widgets.push({
                widgetId: 'remediation-tasks',
                widgetKey: 'remediation-tasks-widget',
                componentKey: 'overdue-actions-widget',
                title: 'Remediation Tasks',
                titleAr: 'مهام المعالجة',
                x: 0,
                y: 0,
                w: 12,
                h: 4,
                config: { scenario: 'remediation' },
                priority: 95,
                requiredForRole: false,
                requiredForScenario: true,
            }, {
                widgetId: 'remediation-velocity',
                widgetKey: 'remediation-velocity-widget',
                componentKey: 'engine-trend-widget',
                title: 'Remediation Velocity',
                titleAr: 'سرعة المعالجة',
                x: 0,
                y: 4,
                w: 6,
                h: 3,
                config: {},
                priority: 85,
                requiredForRole: false,
                requiredForScenario: false,
            });
            break;
        case 'audit':
            widgets.push({
                widgetId: 'audit-readiness',
                widgetKey: 'audit-readiness-widget',
                componentKey: 'audit-exposure-widget',
                title: 'Audit Readiness',
                titleAr: 'جاهزية التدقيق',
                x: 0,
                y: 0,
                w: 12,
                h: 4,
                config: { scenario: 'audit' },
                priority: 95,
                requiredForRole: false,
                requiredForScenario: true,
            }, {
                widgetId: 'evidence-traceability',
                widgetKey: 'evidence-traceability-widget',
                componentKey: 'evidence-coverage-widget',
                title: 'Evidence Traceability',
                titleAr: 'إمكانية تتبع الأدلة',
                x: 0,
                y: 4,
                w: 6,
                h: 3,
                config: {},
                priority: 90,
                requiredForRole: false,
                requiredForScenario: false,
            });
            break;
        case 'executive':
            widgets.push({
                widgetId: 'executive-dashboard',
                widgetKey: 'executive-dashboard-widget',
                componentKey: 'executive-summary-widget',
                title: 'Executive Dashboard',
                titleAr: 'لوحة المعلومات التنفيذية',
                x: 0,
                y: 0,
                w: 12,
                h: 3,
                config: { scenario: 'executive', summary: true },
                priority: 100,
                requiredForRole: false,
                requiredForScenario: true,
            }, {
                widgetId: 'compliance-posture',
                widgetKey: 'compliance-posture-widget',
                componentKey: 'maturity-score-widget',
                title: 'Compliance Posture',
                titleAr: 'وضع الامتثال',
                x: 0,
                y: 3,
                w: 4,
                h: 3,
                config: {},
                priority: 90,
                requiredForRole: false,
                requiredForScenario: false,
            }, {
                widgetId: 'risk-posture',
                widgetKey: 'risk-posture-widget',
                componentKey: 'risk-heatmap-widget',
                title: 'Risk Posture',
                titleAr: 'وضع المخاطر',
                x: 4,
                y: 3,
                w: 4,
                h: 3,
                config: {},
                priority: 90,
                requiredForRole: false,
                requiredForScenario: false,
            }, {
                widgetId: 'top-issues',
                widgetKey: 'top-issues-widget',
                componentKey: 'recommendations-widget',
                title: 'Top Issues',
                titleAr: 'أهم القضايا',
                x: 8,
                y: 3,
                w: 4,
                h: 3,
                config: { limit: 5 },
                priority: 85,
                requiredForRole: false,
                requiredForScenario: false,
            });
            break;
        case 'operations':
            widgets.push({
                widgetId: 'operational-dashboard',
                widgetKey: 'operational-dashboard-widget',
                componentKey: 'executive-summary-widget',
                title: 'Operations Dashboard',
                titleAr: 'لوحة المعلومات التشغيلية',
                x: 0,
                y: 0,
                w: 12,
                h: 2,
                config: { scenario: 'operations' },
                priority: 95,
                requiredForRole: false,
                requiredForScenario: true,
            }, {
                widgetId: 'pending-tasks',
                widgetKey: 'pending-tasks-widget',
                componentKey: 'overdue-actions-widget',
                title: 'Pending Tasks',
                titleAr: 'المهام المعلقة',
                x: 0,
                y: 2,
                w: 6,
                h: 4,
                config: {},
                priority: 90,
                requiredForRole: false,
                requiredForScenario: false,
            }, {
                widgetId: 'sla-tracker',
                widgetKey: 'sla-tracker-widget',
                componentKey: 'kri-status-widget',
                title: 'SLA Tracker',
                titleAr: 'متتبع SLA',
                x: 6,
                y: 2,
                w: 6,
                h: 4,
                config: {},
                priority: 85,
                requiredForRole: false,
                requiredForScenario: false,
            });
            break;
    }
    return widgets;
}
function getOrgStatusSpecificWidgets(ctx) {
    const widgets = [];
    switch (ctx.orgStatus) {
        case 'trial':
            widgets.push({
                widgetId: 'trial-status',
                widgetKey: 'trial-status-widget',
                componentKey: 'kri-status-widget',
                title: 'Trial Status',
                titleAr: 'حالة التجربة',
                x: 0,
                y: 0,
                w: 4,
                h: 2,
                config: { orgStatus: 'trial' },
                priority: 70,
                requiredForRole: false,
                requiredForScenario: false,
            });
            break;
        case 'suspended':
            widgets.push({
                widgetId: 'suspension-notice',
                widgetKey: 'suspension-notice-widget',
                componentKey: 'executive-summary-widget',
                title: 'Account Suspended',
                titleAr: 'الحساب معلق',
                x: 0,
                y: 0,
                w: 12,
                h: 2,
                config: { orgStatus: 'suspended', alert: true },
                priority: 100,
                requiredForRole: false,
                requiredForScenario: false,
            });
            break;
    }
    return widgets;
}
function getMaturitySpecificWidgets(ctx) {
    const widgets = [];
    switch (ctx.orgMaturity) {
        case 'initial':
            widgets.push({
                widgetId: 'maturity-guidance',
                widgetKey: 'maturity-guidance-widget',
                componentKey: 'recommendations-widget',
                title: 'Maturity Guidance',
                titleAr: 'إرشادات النضج',
                x: 0,
                y: 0,
                w: 6,
                h: 3,
                config: { maturity: 'initial' },
                priority: 75,
                requiredForRole: false,
                requiredForScenario: false,
            });
            break;
        case 'optimized':
            widgets.push({
                widgetId: 'advanced-metrics',
                widgetKey: 'advanced-metrics-widget',
                componentKey: 'engine-executive-summary-widget',
                title: 'Advanced Metrics',
                titleAr: 'المقاييس المتقدمة',
                x: 0,
                y: 0,
                w: 12,
                h: 3,
                config: { maturity: 'optimized', predictive: true },
                priority: 85,
                requiredForRole: false,
                requiredForScenario: false,
            });
            break;
    }
    return widgets;
}
// ── Auto-Layout Algorithm ────────────────────────────────────────────────────
function autoLayoutWidgets(widgets) {
    const COLUMNS = 12;
    const placed = [];
    let currentY = 0;
    for (const widget of widgets) {
        // Find first available position
        let placedX = -1;
        let placedY = -1;
        for (let y = currentY; y < currentY + 20; y++) {
            for (let x = 0; x <= COLUMNS - widget.w; x++) {
                if (canPlace(placed, x, y, widget.w, widget.h)) {
                    placedX = x;
                    placedY = y;
                    break;
                }
            }
            if (placedX >= 0)
                break;
        }
        if (placedX < 0) {
            // Fallback: place at current Y, X=0
            placedX = 0;
            placedY = currentY;
        }
        widget.x = placedX;
        widget.y = placedY;
        // Mark cells as occupied
        for (let dy = 0; dy < widget.h; dy++) {
            for (let dx = 0; dx < widget.w; dx++) {
                const cy = placedY + dy;
                const cx = placedX + dx;
                if (!placed[cy])
                    placed[cy] = [];
                placed[cy][cx] = true;
            }
        }
        currentY = Math.max(currentY, placedY + widget.h);
    }
    return widgets;
}
function canPlace(placed, x, y, w, h) {
    for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
            const cy = y + dy;
            const cx = x + dx;
            if (placed[cy] && placed[cy][cx])
                return false;
        }
    }
    return true;
}
// ── Dashboard Title Helpers ───────────────────────────────────────────────────
function getDashboardTitle(ctx) {
    const parts = [];
    if (ctx.scenario) {
        parts.push(ctx.scenario.charAt(0).toUpperCase() + ctx.scenario.slice(1));
    }
    if (ctx.moduleCode) {
        parts.push(ctx.moduleCode.charAt(0).toUpperCase() + ctx.moduleCode.slice(1));
    }
    parts.push('Dashboard');
    return parts.join(' ');
}
function getDashboardTitleAr(ctx) {
    const scenarioMap = {
        baseline: 'الأساس',
        assessment: 'التقييم',
        remediation: 'المعالجة',
        audit: 'التدقيق',
        executive: 'التنفيذي',
        operations: 'التشغيل',
    };
    const moduleMap = {
        risk: 'المخاطر',
        compliance: 'الامتثال',
        evidence: 'الأدلة',
        workflow: 'سير العمل',
    };
    const parts = [];
    if (ctx.scenario && scenarioMap[ctx.scenario]) {
        parts.push(scenarioMap[ctx.scenario]);
    }
    if (ctx.moduleCode && moduleMap[ctx.moduleCode]) {
        parts.push(moduleMap[ctx.moduleCode]);
    }
    parts.push('لوحة المعلومات');
    return parts.join(' ');
}
//# sourceMappingURL=context-aware-dashboard.service.js.map