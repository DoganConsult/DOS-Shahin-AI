/**
 * Shared Components Barrel Export
 * 
 * This barrel export provides convenient access to canonical shared components.
 * 
 * NOTE: Direct imports are preferred for better tree-shaking, but this barrel
 * export is provided for convenience.
 * 
 * @see CANONICAL_COMPONENT_MAP.md for complete component documentation
 * @see PLATFORM_INTEGRATION_SETUP.md for integration patterns
 */

// Page Structure Components
export { PageShellComponent } from './layouts/page-shell.component';
export { PageHeaderComponent, type PageHeaderAction } from './layouts/page-header.component';
export { SectionHeaderComponent } from '../widgets/section-header/section-header.component';

// Data Display Components
export { StatCardComponent } from './status-indicators/stat-card.component';

// State Components
export { SkeletonLoaderComponent } from './guided-interaction/skeleton-loader.component';
export { EmptyStateComponent } from './layouts/primitives/empty-state.component';
export { StatusBadgeComponent } from './status-indicators/badges/status-badge.component';

// Form Components
export { GrcFormFieldComponent } from './forms-inputs/grc-form-field.component';

// Table Components
export { GrcDataTableComponent } from './grc-core/grc-data-table.component';

// Icon Component
export { IconComponent } from './guided-interaction/icon.component';

// AI Transparency
export { AiBadgeComponent } from './ai/ai-badge.component';

// Module Overview Kit (standardized per-module UI shell)
export { ModuleOverviewKitComponent, type ModuleOverviewKitConfig } from './module-chrome/module-display/module-overview-kit.component';
export { AgentStatusBadgeComponent, type AgentInfo } from './ai/agent-status-badge.component';
export { WorkflowTierIndicatorComponent } from './status-indicators/workflow-tier-indicator.component';

// Cross-Module Components
export { EntityWorkflowPanelComponent } from './entity/entity-workflow-panel.component';
export { ConfidenceHeatmapComponent, type HeatmapDimension } from './status-indicators/confidence-heatmap.component';
export { QuickLinkChipComponent } from './grc-core/quick-link-chip.component';
export { EntityDetailDrawerComponent } from './entity/entity-detail-drawer.component';
export { KpiCardGridComponent } from './status-indicators/kpi-card-grid.component';
export { HealthStripComponent } from './status-indicators/health-strip.component';
export { ModuleShellComponent } from './module-chrome/module-shell.component';

// IBM Carbon 9-Layer Module Shell Components
export { ModuleMastheadComponent, type MastheadConfig, type ModuleHealthLevel } from './module-chrome/module-masthead.component';
export { ModuleActionBarComponent, type ActionBarItem, type ActionBarSlot, type ViewMode } from './module-chrome/module-action-bar.component';
export { ModuleContextRailComponent, type RelatedRecord, type AuditEntry, type NoteEntry } from './module-chrome/module-context-rail.component';
export { ModuleWorkflowRibbonComponent, type WorkflowRibbonConfig } from './module-chrome/module-workflow-ribbon.component';
export { ModuleStickyFooterComponent, type StickyFooterConfig } from './module-chrome/module-sticky-footer.component';
export { ModuleStatePresetComponent, type StatePreset } from './module-chrome/module-state-preset.component';
export { CanonicalModuleShellComponent, type CanonicalShellConfig } from './module-chrome/generic/canonical-module-shell.component';

// Canonical Layout Wrappers
export { CommandCenterLayoutComponent } from './layouts/command-center-layout.component';
export { RegistryLayoutComponent } from './layouts/registry-layout.component';
export { CaseWorkspaceLayoutComponent } from './layouts/case-workspace-layout.component';
export { StudioLayoutComponent } from './layouts/studio-layout.component';

// Note: Widget Shell is exported from dashboard/shared, not here
// import { WidgetShellComponent } from '@app/dashboard';

// Note: Scope Filter Bar is exported from its own directory
// import { ScopeFilterBarComponent } from '@app/shared/scope-filter-bar/scope-filter-bar.component';

// Spec §11.4 Shared Operational Components
export { ActivityTimelinePanelComponent, type ActivityTimelineEvent } from './messaging/activity-timeline-panel.component';
export { DataFreshnessBadgeComponent, type FreshnessState, type FreshnessLevel } from './status-indicators/badges/data-freshness-badge.component';
export { WorkspaceContextSwitcherComponent, type WorkspaceContext } from './page-chrome/nav/workspace-context-switcher.component';

// Note: Global Search is exported from its own directory
// import { GlobalSearchComponent } from '@app/shared/global-search/global-search.component';

// Note: Sidebar is exported from layout
// import { AppSidebarComponent } from '@app/layout/app-sidebar.component';

// Note: Charts are exported from charts directory
// import { EChartComponent } from '@app/shared/charts/echart.component';
// import { PlotlyChartComponent } from '@app/shared/charts/plotly-chart.component';
