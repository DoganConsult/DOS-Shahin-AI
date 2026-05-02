import { safeQuery } from "@dos/db";

// ============================================
// Shahin — Regulatory Submission Generator
// Barrel re-export preserving all public exports
// ============================================

export type {
  RegulatorySubmissionDraft,
  SubmissionSection,
  SubmissionTemplate,
} from "./submission.types";

export { SUBMISSION_TEMPLATES } from "./submission-templates";

export {
  extractComplianceScore,
  extractControlStatus,
  extractEvidenceCoverage,
  extractRiskPosture,
  extractIncidentSummary,
  extractRemediationStatus,
} from "./data-extractors";

export { generateAINarrative } from "./ai-narrative";

export { generateRegulatorySubmissionDraft } from "./submission-generator";

export { exportSubmissionDraftPDF } from "./submission-pdf";

export {
  saveSubmissionDraft,
  getSubmissionDraft,
  listSubmissionDrafts,
  updateSubmissionStatus,
} from "./submission-repository";
