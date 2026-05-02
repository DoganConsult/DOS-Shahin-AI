/**
 * @deprecated @removal-date Phase 9 @owner Product @replacement features/risk/security/risk-dashboard-map(visibleToRoles) Role-list visibility truth must be consumed from the
 * DAuth access snapshot, not defined locally. These role arrays are rendering hints
 * only and must not be used as security enforcement. Actual widget access control is
 * enforced server-side via requirePermission('risk.record.read') on all data endpoints.
 *
 * TODO(rebuild): Replace widgetVisibility with access-snapshot-driven rendering once
 * the DAuth frontend consumption contract (§2.15) exposes module widget permissions.
 * @removal-date 2026-09-30 @owner DAuth @replacement AccessSnapshotService widget grants
 */

export interface RiskWidgetVisibility {
  requiredPermission: string;
}

export const RISK_WIDGET_PERMISSIONS: Record<string, RiskWidgetVisibility> = {
  'risk.heatmap':           { requiredPermission: 'risk.record.read' },
  'risk.top_risks':         { requiredPermission: 'risk.record.read' },
  'risk.treatment_progress':{ requiredPermission: 'risk.record.read' },
  'risk.kri_alerts':        { requiredPermission: 'risk.record.read' },
  'risk.appetite_gauge':    { requiredPermission: 'risk.record.read' },
};

export const RISK_DASHBOARD_MAP = {
  moduleCode: 'risk',
  dashboardPresets: ['risk_ops'],
  widgetPermissions: RISK_WIDGET_PERMISSIONS,
};
