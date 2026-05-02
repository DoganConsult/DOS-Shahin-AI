// ============================================
// Shahin — Main Submission Draft Generator
// Orchestrates data extraction, AI narrative,
// and section assembly into a complete draft
// ============================================

import { RegulatorySubmissionDraft } from "./submission.types";

/**
 * Generate a regulatory submission draft for a tenant.
 * Resolves the matching template, extracts live data for each section,
 * generates AI narratives where configured, and returns the full draft.
 */
export async function generateRegulatorySubmissionDraft(
  _tenantId: string,
  _regulatorCode: string,
  _frameworkCode: string,
  _submissionType: "annual" | "quarterly" | "ad-hoc" | "exam-response" = "annual",
  _periodStart?: string,
  _periodEnd?: string,
  _language: "en" | "ar" | "bilingual" = "bilingual",
  _generatedBy: string = "system"
): Promise<RegulatorySubmissionDraft> {
  // Step-8 placeholder removal: this orchestrator was an incomplete
  // shim that previously returned `compliance_items` rows cast as a
  // RegulatorySubmissionDraft, masking the missing implementation.
  // The canonical, working implementation lives in
  // `../regulatory/regulatory-submission-generator.service.ts` and is
  // the one wired into the routes. Importing this symbol must fail
  // loudly rather than silently return wrong-shaped data.
  throw Object.assign(
    new Error(
      'regulatory-submission/submission-generator is not implemented; use regulatory/regulatory-submission-generator.service.ts',
    ),
    { statusCode: 501, code: 'SUBMISSION_GENERATOR_NOT_IMPLEMENTED' },
  );
}
