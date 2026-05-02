// Phase 11 (M5) — regulatory-submission-generator shim. Canonical
// implementation lives in modules/compliance; reporting's report.routes
// imports it only for a scheduled batch flow that is not part of the
// Wave-1 M5 surface. Returns a safe empty payload so the route file
// loads cleanly.

export interface SubmissionRequest {
  tenantId: string;
  frameworkCode: string;
  submissionType: string;
}

export interface SubmissionResult {
  success: boolean;
  submissionId?: string;
  reason?: string;
}

export async function generateRegulatorySubmission(
  _req: SubmissionRequest,
): Promise<SubmissionResult> {
  return { success: false, reason: 'not-configured-in-wave-1' };
}

export interface RegulatorySubmissionDraft {
  submissionId: string;
  tenantId: string;
  regulatorCode: string;
  frameworkCode: string;
  submissionType: string;
  status: string;
  payload: Record<string, unknown>;
}

export async function generateRegulatorySubmissionDraft(
  tenantId: string,
  regulatorCode: string,
  frameworkCode: string,
  submissionType: string,
  periodStart?: string,
  periodEnd?: string,
  language?: string,
  requestedBy?: string,
): Promise<RegulatorySubmissionDraft> {
  return {
    submissionId: `${tenantId}-${regulatorCode}-${frameworkCode}-${Date.now()}`,
    tenantId,
    regulatorCode,
    frameworkCode,
    submissionType,
    status: 'draft',
    payload: { submissionType, periodStart, periodEnd, language, requestedBy },
  };
}

export async function exportSubmissionDraftPDF(_tenantId: string, _submissionId: string): Promise<Buffer> {
  return Buffer.alloc(0);
}

export async function saveSubmissionDraft(_tenantId: string, _draft: RegulatorySubmissionDraft): Promise<void> {
  return;
}

export async function getSubmissionDraft(_tenantId: string, _submissionId: string): Promise<RegulatorySubmissionDraft | null> {
  return null;
}

export async function listSubmissionDrafts(
  _tenantId: string,
  _regulatorCode?: string,
  _frameworkCode?: string,
): Promise<RegulatorySubmissionDraft[]> {
  return [];
}

export async function updateSubmissionStatus(
  _tenantId: string,
  _submissionId: string,
  _status: string,
  _reviewNotes?: string,
): Promise<void> {
  return;
}
