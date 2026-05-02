import './interface/lifecycle-registration';

export { runMigrations } from './db/runner';
export type { DbClient, RunMigrationsResult, MigrationRecord } from './db/runner';

export { default as riskRoutes } from './interface/http/risk.routes';
export { default as riskWorkspaceRoutes } from './interface/http/risk-workspace.routes';
export { default as riskSmartRoutes } from './interface/http/risk-smart.routes';
export { default as riskMetricsRoutes } from './interface/http/risk-metrics.routes';
export { default as riskScoringRoutes } from './interface/http/risk-scoring.routes';
export { default as riskTrendsRoutes } from './interface/http/risk-trends.routes';
export { default as riskQuantificationRoutes } from './interface/http/risk-quantification.routes';
export { default as riskMonteCarloRoutes } from './interface/http/monte-carlo.routes';
export { default as riskPeerReviewRoutes } from './interface/http/risk-peer-review.routes';
export { default as riskAdminRoutes } from './interface/http/risk-admin.routes';
export { default as riskDiagnosticsRoutes } from './interface/http/risk-diagnostics.routes';
export { default as riskRegisterRoutes } from './interface/http/risk-register.routes';
export { default as riskReviewApprovalRoutes } from './interface/http/risk-review-approval.routes';
export { default as fairFinancialQuantificationRoutes } from './interface/http/fair-financial-quantification.routes';
export { default as modelRiskRoutes } from './interface/http/model-risk.routes';
export { default as scoreCalibrationRoutes } from './interface/http/score-calibration.routes';
export { default as vulnerabilitiesRoutes } from './interface/http/vulnerabilities.routes';

export { bindRiskPorts, registerRisk, onInstall, onActivate, onMigrate, onUninstall } from './bootstrap';
export type { RiskHostBindings, RegisterRiskOptions, RegisterRiskResult } from './bootstrap';

export { RISK_MODULE_PERMISSIONS } from './interface/security/risk.permissions';
export { RISK_MODULE_ROLES } from './interface/security/risk.roles';
export { RISK_SOD_RULES } from './interface/security/risk.sod';

export {
  RISK_EVENT_NAMES,
  RISK_CONSUMED_EVENT_NAMES,
  RISK_PERMISSION_CODES,
  RISK_ERROR_CODES,
} from './contracts';
export type {
  RiskEventName,
  RiskConsumedEventName,
  RiskPermissionCode,
  RiskErrorCode,
  RiskErrorBody,
} from './contracts';
