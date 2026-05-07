import { withTenantClient } from '../../ports/database.port';
import {
  extractComplianceScore as _extractScore,
  extractControlStatus as _extractControls,
  extractEvidenceCoverage as _extractEvidence,
  extractRiskPosture as _extractRisk,
  extractIncidentSummary as _extractIncidents,
  extractRemediationStatus as _extractRemediation,
} from '../regulatory-submission/data-extractors';
import { logger } from '../../ports/logger.port';

export interface SubmissionSection {
  sectionCode: string;
  title: string;
  content: string;
  order: number;
}

export interface SubmissionTemplate {
  templateCode: string;
  frameworkCode: string;
  sections: SubmissionSection[];
}

export interface RegulatorySubmissionDraft {
  draftId: string;
  tenantId: string;
  frameworkCode: string;
  status: string;
  sections: SubmissionSection[];
  createdAt: string;
  updatedAt?: string;
}

export const SUBMISSION_TEMPLATES: SubmissionTemplate[] = [
  {
    templateCode: 'default_submission',
    frameworkCode: '*',
    sections: [
      { sectionCode: 'exec_summary', title: 'Executive Summary', content: '', order: 1 },
      { sectionCode: 'compliance_status', title: 'Compliance Status', content: '', order: 2 },
      { sectionCode: 'controls', title: 'Control Status', content: '', order: 3 },
      { sectionCode: 'evidence', title: 'Evidence Coverage', content: '', order: 4 },
      { sectionCode: 'risk', title: 'Risk Posture', content: '', order: 5 },
      { sectionCode: 'remediation', title: 'Remediation Status', content: '', order: 6 },
    ],
  },
];

export async function extractComplianceScore(tenantId: string, frameworkCode: string): Promise<unknown> {
  return _extractScore(tenantId, frameworkCode);
}
export async function extractControlStatus(tenantId: string, frameworkCode: string): Promise<unknown> {
  return _extractControls(tenantId, frameworkCode);
}
export async function extractEvidenceCoverage(tenantId: string, frameworkCode: string): Promise<unknown> {
  return _extractEvidence(tenantId, frameworkCode);
}
export async function extractRiskPosture(tenantId: string): Promise<unknown> {
  return _extractRisk(tenantId);
}
export async function extractIncidentSummary(tenantId: string): Promise<unknown> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth() - 12, 1).toISOString();
  const periodEnd = now.toISOString();
  return _extractIncidents(tenantId, periodStart, periodEnd);
}
export async function extractRemediationStatus(tenantId: string, frameworkCode?: string): Promise<unknown> {
  return _extractRemediation(tenantId, frameworkCode || '*');
}

export async function generateAINarrative(
  tenantId: string,
  context: Record<string, unknown>,
): Promise<string> {
  try {
    // @ts-ignore -- justified: dynamic import resolved at runtime
    const { invokeAI } = await import('../../ports/ai.port');
    const prompt = `Generate a concise regulatory compliance narrative based on the following data:\n${JSON.stringify(context, null, 2)}`;
    const result = await invokeAI(tenantId, { prompt, maxTokens: 1000 });
    return typeof result === 'string' ? result : (result as any)?.text || JSON.stringify(result);
  } catch (e: unknown) {
    logger.warn('[RegulatorySubmission] AI narrative fallback — using template', { error: String(e) });
    const score = context.complianceScore ?? 'N/A';
    return `Compliance assessment completed with a score of ${score}%. Key findings and remediation actions are detailed in the sections below.`;
  }
}

export async function generateRegulatorySubmissionDraft(
  tenantId: string,
  frameworkCode: string,
  options?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const [complianceData, controlData, evidenceData, riskData, incidentData, remediationData] = await Promise.allSettled([
    extractComplianceScore(tenantId, frameworkCode),
    extractControlStatus(tenantId, frameworkCode),
    extractEvidenceCoverage(tenantId, frameworkCode),
    extractRiskPosture(tenantId),
    extractIncidentSummary(tenantId),
    extractRemediationStatus(tenantId, frameworkCode),
  ]);

  const resolve = (r: PromiseSettledResult<unknown>) => r.status === 'fulfilled' ? r.value : {};

  const sections: SubmissionSection[] = [
    { sectionCode: 'exec_summary', title: 'Executive Summary', content: JSON.stringify(resolve(complianceData)), order: 1 },
    { sectionCode: 'compliance_status', title: 'Compliance Status', content: JSON.stringify(resolve(complianceData)), order: 2 },
    { sectionCode: 'controls', title: 'Control Status', content: JSON.stringify(resolve(controlData)), order: 3 },
    { sectionCode: 'evidence', title: 'Evidence Coverage', content: JSON.stringify(resolve(evidenceData)), order: 4 },
    { sectionCode: 'risk', title: 'Risk Posture', content: JSON.stringify(resolve(riskData)), order: 5 },
    { sectionCode: 'incidents', title: 'Incident Summary', content: JSON.stringify(resolve(incidentData)), order: 6 },
    { sectionCode: 'remediation', title: 'Remediation Status', content: JSON.stringify(resolve(remediationData)), order: 7 },
  ];

  const draft = {
    tenantId,
    frameworkCode,
    status: 'draft',
    createdAt: new Date().toISOString(),
    sections,
    generatedBy: (options as any)?.userId || 'system',
  };

  const saved = await saveSubmissionDraft(tenantId, draft);
  return saved;
}

/**
 * Export a submission draft as a printable text/plain buffer.
 * PDF rendering with a real PDF library (pdfkit/puppeteer) is a follow-up;
 * for now this returns a structured text representation suitable for print
 * preview / forwarding to the regulator portal as a text artifact.
 */
export async function exportSubmissionDraftPDF(
  tenantId: string,
  draftId: string,
): Promise<Buffer> {
  const draft = await getSubmissionDraft(tenantId, draftId);
  if (!draft) throw new Error(`regulatory submission ${draftId} not found`);
  const lines: string[] = [];
  lines.push(`Regulatory Submission`);
  lines.push(`====================`);
  lines.push(`Framework: ${(draft as any).framework_code ?? (draft as any).frameworkCode ?? 'N/A'}`);
  lines.push(`Status: ${(draft as any).status ?? 'draft'}`);
  lines.push(`Created: ${(draft as any).created_at ?? (draft as any).createdAt ?? ''}`);
  lines.push('');
  const data = (draft as any).data ?? draft;
  const sections = (data?.sections ?? []) as SubmissionSection[];
  for (const s of sections) {
    lines.push(`## ${s.order}. ${s.title}`);
    lines.push(s.content || '(empty)');
    lines.push('');
  }
  return Buffer.from(lines.join('\n'), 'utf8');
}

/** Save a submission draft to the database. */
export async function saveSubmissionDraft(
  tenantId: string,
  draft: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `INSERT INTO regulatory_submissions (framework_code, status, data, created_at)
       VALUES ($1, 'draft', $2, NOW()) RETURNING *`,
      [draft.frameworkCode, JSON.stringify(draft)],
    );
    return result.rows[0] ?? draft;
  });
}

/** Retrieve a single submission draft. */
export async function getSubmissionDraft(
  tenantId: string,
  draftId: string,
): Promise<Record<string, unknown> | null> {
  return withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `SELECT * FROM regulatory_submissions WHERE submission_id = $1`,
      [draftId],
    );
    return result.rows[0] ?? null;
  });
}

/** List submission drafts for a tenant. */
export async function listSubmissionDrafts(
  tenantId: string,
  _filters?: Record<string, unknown>,
): Promise<Array<Record<string, unknown>>> {
  return withTenantClient(tenantId, async (client) => {
    const result = await client.query(
      `SELECT * FROM regulatory_submissions ORDER BY created_at DESC LIMIT 50`,
    );
    return result.rows;
  });
}

/** Update submission status. */
export async function updateSubmissionStatus(
  tenantId: string,
  submissionId: string,
  status: string,
): Promise<void> {
  await withTenantClient(tenantId, async (client) => {
    await client.query(
      `UPDATE regulatory_submissions SET status = $1, updated_at = NOW() WHERE submission_id = $2`,
      [status, submissionId],
    );
  });
}
