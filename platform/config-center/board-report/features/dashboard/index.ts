export { DashboardModuleDashboardComponent } from './dashboards/dashboard-dashboard.component';
export { DashboardDiagnosticsComponent } from './diagnostics/dashboard-diagnostics.component';
export { DashboardAdminComponent } from './admin/dashboard-admin.component';
export { DashboardWidgetComponent } from './widgets/dashboard-widget.component';
export { DashboardState } from './state/dashboard.state';
export { DASHBOARD_STATES, DASHBOARD_TRANSITIONS, DASHBOARD_TERMINAL_STATES, isValidDashboardTransition, isDashboardTerminal } from './workflows/dashboard-lifecycle';
export type { DashboardDefinitionContract, DashboardWidgetPlacementContract, DashboardDiagnosticsContract, DashboardRegistryContract, DashboardStatus, DashboardType } from './contracts/dashboard.contracts';

// Core widget components
export { WidgetShellComponent, type WidgetState } from './shared/widget-shell/widget-shell.component';

// Chart widget components (public API for cross-module consumption)
export { RiskHeatmapWidgetComponent } from './widgets/risk-vendor-widgets/risk-heatmap/risk-heatmap-widget.component';
export { ComplianceGaugeWidgetComponent } from './widgets/compound-chart-widgets/compliance-gauge-widget/compliance-gauge-widget.component';
export { MaturityRadarWidgetComponent } from './widgets/compound-chart-widgets/maturity-radar-widget/maturity-radar-widget.component';
export { FindingsBarWidgetComponent } from './widgets/compound-chart-widgets/findings-bar-widget/findings-bar-widget.component';
export { EvidenceDonutWidgetComponent } from './widgets/compound-chart-widgets/evidence-donut-widget/evidence-donut-widget.component';
export { TrendLineWidgetComponent } from './widgets/compound-chart-widgets/trend-line-widget/trend-line-widget.component';
export { VendorBubbleWidgetComponent } from './widgets/risk-vendor-widgets/vendor-bubble-widget/vendor-bubble-widget.component';
export { TopRisksComponent } from './widgets/risk-vendor-widgets/top-risks/top-risks.component';
