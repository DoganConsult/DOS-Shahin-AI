/**
 * Qiyas Service -- Facade / barrel re-export.
 *
 * The implementation is split into focused sub-services for maintainability.
 * This file composes them into a single QiyasService class so that all
 * existing consumers (controller, tests) continue to work without changes.
 */
import { QiyasModelsService } from './qiyas-models.service';
import { QiyasAssessmentsService } from './qiyas-assessments.service';
import { QiyasScoringService } from './qiyas-scoring.service';
import { QiyasBenchmarksService } from './qiyas-benchmarks.service';
import { QiyasCertificationService } from './qiyas-certification.service';
import { QiyasRecommendationsService } from './qiyas-recommendations.service';
import { QiyasCalibrationService } from './qiyas-calibration.service';
import { QiyasEvidenceScoringService } from './qiyas-evidence-scoring.service';
import { QiyasMaturityService } from './qiyas-maturity.service';
import { QiyasRespondentsService } from './qiyas-respondents.service';
import { QiyasQuestionsService } from './qiyas-questions.service';
import { QiyasDashboardService } from './qiyas-dashboard.service';

// Re-export all sub-service classes for direct access when needed
export { QiyasModelsService } from './qiyas-models.service';
export { QiyasAssessmentsService } from './qiyas-assessments.service';
export { QiyasScoringService } from './qiyas-scoring.service';
export { QiyasBenchmarksService } from './qiyas-benchmarks.service';
export { QiyasCertificationService } from './qiyas-certification.service';
export { QiyasRecommendationsService } from './qiyas-recommendations.service';
export { QiyasCalibrationService } from './qiyas-calibration.service';
export { QiyasEvidenceScoringService } from './qiyas-evidence-scoring.service';
export { QiyasMaturityService } from './qiyas-maturity.service';
export { QiyasRespondentsService } from './qiyas-respondents.service';
export { QiyasQuestionsService } from './qiyas-questions.service';
export { QiyasDashboardService } from './qiyas-dashboard.service';

/**
 * Composed facade that delegates to focused sub-services.
 * Preserves the exact same public API as the original monolithic class.
 */
export class QiyasService {
  private models = new QiyasModelsService();
  private assessments = new QiyasAssessmentsService();

  private scoring = new QiyasScoringService();
  private benchmarks = new QiyasBenchmarksService();
  private certification = new QiyasCertificationService();
  private recommendations = new QiyasRecommendationsService();
  private calibration = new QiyasCalibrationService();
  private evidenceScoring = new QiyasEvidenceScoringService();
  private maturity = new QiyasMaturityService();
  private respondents = new QiyasRespondentsService();
  private questions = new QiyasQuestionsService();
  private dashboard = new QiyasDashboardService();

  // ═══ Models ═══
  listModels = this.models.listModels.bind(this.models);
  getModel = this.models.getModel.bind(this.models);
  createModel = this.models.createModel.bind(this.models);
  updateModel = this.models.updateModel.bind(this.models);
  listDomains = this.models.listDomains.bind(this.models);
  createDomain = this.models.createDomain.bind(this.models);
  createModelVersion = this.models.createModelVersion.bind(this.models);
  publishModelVersion = this.models.publishModelVersion.bind(this.models);
  listModelVersions = this.models.listModelVersions.bind(this.models);

  // ═══ Assessments & Responses ═══
  listAssessments = this.assessments.listAssessments.bind(this.assessments);
  getAssessment = this.assessments.getAssessment.bind(this.assessments);
  createAssessment = this.assessments.createAssessment.bind(this.assessments);
  updateAssessment = this.assessments.updateAssessment.bind(this.assessments);
  saveResponse = this.assessments.saveResponse.bind(this.assessments);
  listResponses = this.assessments.listResponses.bind(this.assessments);

  // ═══ Scoring ═══
  getAssessmentScores = this.scoring.getAssessmentScores.bind(this.scoring);
  computeScores = this.scoring.computeScores.bind(this.scoring);

  // ═══ Benchmarks ═══
  listBenchmarkComparisons = this.benchmarks.listBenchmarkComparisons.bind(this.benchmarks);
  getBenchmarkPercentiles = this.benchmarks.getBenchmarkPercentiles.bind(this.benchmarks);
  createBenchmarkDataset = this.benchmarks.createBenchmarkDataset.bind(this.benchmarks);
  computeBenchmarkComparison = this.benchmarks.computeBenchmarkComparison.bind(this.benchmarks);
  listBenchmarkDatasets = this.benchmarks.listBenchmarkDatasets.bind(this.benchmarks);

  // ═══ Certification ═══
  getCertificationReadiness = this.certification.getCertificationReadiness.bind(this.certification);
  updateCertificationGapStatus = this.certification.updateCertificationGapStatus.bind(this.certification);
  computeCertificationReadiness = this.certification.computeCertificationReadiness.bind(this.certification);

  // ═══ Recommendations ═══
  listRecommendations = this.recommendations.listRecommendations.bind(this.recommendations);
  createRecommendation = this.recommendations.createRecommendation.bind(this.recommendations);
  updateRecommendationStatus = this.recommendations.updateRecommendationStatus.bind(this.recommendations);
  getImprovementPaths = this.recommendations.getImprovementPaths.bind(this.recommendations);

  // ═══ Calibration ═══
  listCalibrationSessions = this.calibration.listCalibrationSessions.bind(this.calibration);
  createCalibrationSession = this.calibration.createCalibrationSession.bind(this.calibration);
  addCalibrationEntry = this.calibration.addCalibrationEntry.bind(this.calibration);
  finalizeCalibration = this.calibration.finalizeCalibration.bind(this.calibration);

  // ═══ Evidence Scoring ═══
  getEvidenceScoringModels = this.evidenceScoring.getEvidenceScoringModels.bind(this.evidenceScoring);
  scoreEvidence = this.evidenceScoring.scoreEvidence.bind(this.evidenceScoring);
  getEvidenceQualityMetrics = this.evidenceScoring.getEvidenceQualityMetrics.bind(this.evidenceScoring);

  // ═══ Maturity Analytics ═══
  takeMaturitySnapshot = this.maturity.takeMaturitySnapshot.bind(this.maturity);
  getMaturitySnapshots = this.maturity.getMaturitySnapshots.bind(this.maturity);
  getProgressionHistory = this.maturity.getProgressionHistory.bind(this.maturity);
  getMaturityHeatmap = this.maturity.getMaturityHeatmap.bind(this.maturity);
  getTargetProfiles = this.maturity.getTargetProfiles.bind(this.maturity);
  upsertTargetProfile = this.maturity.upsertTargetProfile.bind(this.maturity);

  // ═══ Respondents & Scoping ═══
  listRespondents = this.respondents.listRespondents.bind(this.respondents);
  assignRespondent = this.respondents.assignRespondent.bind(this.respondents);
  removeRespondent = this.respondents.removeRespondent.bind(this.respondents);
  getRespondentProgress = this.respondents.getRespondentProgress.bind(this.respondents);
  listScopes = this.respondents.listScopes.bind(this.respondents);
  addScope = this.respondents.addScope.bind(this.respondents);
  removeScope = this.respondents.removeScope.bind(this.respondents);

  // ═══ Questions ═══
  listQuestions = this.questions.listQuestions.bind(this.questions);
  createQuestion = this.questions.createQuestion.bind(this.questions);
  updateQuestion = this.questions.updateQuestion.bind(this.questions);
  deleteQuestion = this.questions.deleteQuestion.bind(this.questions);
  listQuestionGroups = this.questions.listQuestionGroups.bind(this.questions);

  // ═══ Dashboard ═══
  getDashboardSummary = this.dashboard.getDashboardSummary.bind(this.dashboard);
}
