import { safeQuery } from "@dos/db";

// ============================================
// Shahin -- Risk Workspace Service (barrel)
// Re-exports all risk-workspace functions from
// their focused service files. Import paths that
// reference this file continue to work unchanged.
// ============================================

export { getRiskOverview } from './risk-overview.service';

export {
  getRiskRegister,
  getRiskDetailById,
  exportRiskRegister,
} from './risk-register.service';

export {
  createRiskEntry,
  updateRiskEntry,
} from './risk-crud.service';

export {
  assessRiskEntry,
  linkControlToRisk,
  linkEvidenceToRisk,
  escalateRiskEntry,
  getRiskScoreHistory,
  getRiskDependencies,
  bulkUpdateRisks,
} from '../scoring/risk-assessment.service';

export {
  getRiskHeatmap,
  getHeatmapMigration,
} from '../analytics/risk-heatmap-workspace.service';

export {
  getTreatments,
  getTreatmentById,
  createTreatmentEntry,
  updateTreatmentEntry,
  validateTreatmentEntry,
  getTreatmentBoard,
  getTreatmentEffectiveness,
} from '../treatments/risk-treatments.service';

export {
  getKRIs,
  createKRIEntry,
  updateKRIEntry,
  getKRITrendsData,
  getKRIBreachLog,
  getReviewCadenceData,
  getKRIHistory,
  getKRICorrelation,
} from '../kri/risk-kri.service';

export {
  getAppetiteConfig,
  updateAppetiteConfigEntry,
  getAppetiteBreaches,
  requestAcceptance,
  approveAcceptance,
  getAcceptanceQueue,
  getAppetiteTrends,
  getAcceptanceHistory,
  getAppetiteCategoryGauges,
} from '../treatments/risk-appetite.service';
