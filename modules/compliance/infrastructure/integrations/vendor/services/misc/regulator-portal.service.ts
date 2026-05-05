// ============================================
// Shahin — Regulator Portal Service
// Read-only compliance data for regulator
// inspectors with field masking, inquiry
// submission, and AI-drafted responses.
// ============================================

import { withTenantClient, safeQuery } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { createNotification } from '../../../notification/services/notification.service';
import { getAiPort } from '../../../../../ports/ai.port';
import type {
  Organization,
  ComplianceData,
  Evidence,
  InquiryInput,
  Inquiry,
  AuditEntry,
  Framework,
} from '@dos/types';
import type { GenericRow } from '@dos/types';
import { v4 as uuid } from 'uuid';

// ── Field Masking Utility ──────────────────────────────────────────────────

/**
 * Masking rule: each entry specifies a dot-path field to strip from payloads.
 * Example: { field: 'contactEmail' } removes `contactEmail` from top-level,
 *          { field: 'metadata.internalNotes' } removes nested path.
 */
export interface MaskingRule {
  field: string;
}

/**
 * Apply tenant-configured field masking rules to response data.
 * Strips sensitive fields from the payload before returning to regulators.
 * Supports both single objects and arrays.
 *
 * Validates: Requirements 6.2
 */
export function applyFieldMasking<T>(data: T, rules: MaskingRule[]): T {
  if (!rules || rules.length === 0) return data;

  if (Array.isArray(data)) {
    return data.map((item) => maskObject(item, rules)) as unknown as T;
  }

  if (data !== null && typeof data === 'object') {
    return maskObject((data as any), rules) as unknown as T;
  }

  return data;
}

/**
 * Remove a dot-path field from an object (shallow copy).
 * e.g. field = 'metadata.internalNotes' removes obj.metadata.internalNotes
 */
function maskObject<T extends Record<string, unknown>>(obj: T, rules: MaskingRule[]): T {
  let result = { ...obj };

  for (const rule of rules) {
    const parts = rule.field.split('.');
    if (parts.length === 1) {
      delete result[parts[0]];
    } else {
      result = deleteNestedField(result, parts) as T;
    }
  }

  return result;
}

/**
 * Recursively delete a nested field specified by path segments.
 */
function deleteNestedField(obj: Record<string, unknown>, parts: string[]): Record<string, unknown> {
  if (parts.length === 0) return obj;

  const [head, ...rest] = parts;
  if (!(head in obj)) return obj;

  if (rest.length === 0) {
    const copy = { ...obj };
    delete copy[head];
    return copy;
  }

  if (obj[head] !== null && typeof obj[head] === 'object' && !Array.isArray(obj[head])) {
    return { ...obj, [head]: deleteNestedField({ ...obj[head] }, rest) };
  }

  return obj;
}

// ── Assignment Validation ──────────────────────────────────────────────────

/**
 * Verify that a regulator user is assigned to the given tenant.
 * Queries regulator_assignments in the master/public schema.
 */
async function validateAssignment(regulatorUserId: string, tenantId: string): Promise<boolean> {
  const result = await safeQuery(
    `SELECT assignment_id FROM public.regulator_assignments
     WHERE regulator_id = $1 AND tenant_id::text = $2
     LIMIT 1`,
    [regulatorUserId, tenantId],
  );
  return result.rows.length > 0;
}

/**
 * Fetch the list of tenant IDs assigned to a regulator user.
 */
async function getAssignedTenantIds(regulatorUserId: string): Promise<string[]> {
  const result = await safeQuery(
    `SELECT tenant_id FROM public.regulator_assignments
     WHERE regulator_id = $1`,
    [regulatorUserId],
  );
  return result.rows.map((r: GenericRow) => String(r.tenant_id));
}

/**
 * Load tenant-configured masking rules for regulator portal.
 * Falls back to empty array if no rules configured.
 */
async function getTenantMaskingRules(tenantId: string): Promise<MaskingRule[]> {
  try {
    return await withTenantClient(tenantId, async (client) => {
      const r = await client.query<{ config_value: unknown }>(
        `SELECT config_value FROM tenant_config
          WHERE config_key = 'regulator_field_masking'
          LIMIT 1`,
      );
      const raw = r.rows[0]?.config_value;
      if (!raw) return [];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    });
  } catch {
    return [];
  }
}

// ── Service Functions ──────────────────────────────────────────────────────

/**
 * Get all organizations (tenants) assigned to a regulator inspector.
 * Queries master schema for assignments, then fetches summary data per tenant.
 */
export async function getAssignedOrganizations(
  regulatorUserId: string,
): Promise<Organization[]> {
  const tenantIds = await getAssignedTenantIds(regulatorUserId);
  const orgs: Organization[] = [];

  for (const tid of tenantIds) {
    try {
      const row = await withTenantClient(tid, async (client) => {
        const r = await client.query<{
          tenant_name: string | null;
          compliance_score: number | string | null;
          status: string | null;
        }>(
          `SELECT tenant_name, compliance_score, status
             FROM tenant_info
            LIMIT 1`,
        );
        return r.rows[0] ?? null;
      });
      const maskingRules = await getTenantMaskingRules(tid);
      const org: Organization = {
        tenantId: tid,
        name: row?.tenant_name || tid,
        complianceScore: Number(row?.compliance_score ?? 0),
        status: (row?.status as Organization['status']) || 'active',
      };
      orgs.push(applyFieldMasking(org, maskingRules));
    } catch {
      orgs.push({ tenantId: tid, name: tid, complianceScore: 0, status: 'active' as Organization['status'] });
    }
  }

  return orgs;
}

async function assertAssigned(regulatorUserId: string, tenantId: string): Promise<void> {
  const ok = await validateAssignment(regulatorUserId, tenantId);
  if (!ok) throw new Error(`regulator ${regulatorUserId} is not assigned to tenant ${tenantId}`);
}

/**
 * Get compliance data for a specific organization.
 * Validates regulator assignment before returning data.
 */
export async function getOrganizationCompliance(
  tenantId: string,
  regulatorUserId: string,
): Promise<ComplianceData> {
  await assertAssigned(regulatorUserId, tenantId);
  const data = await withTenantClient(tenantId, async (client) => {
    const summaryRes = await client.query<{ overall_score: string | number; status: string }>(
      `SELECT COALESCE(ROUND(AVG(score),1)::numeric, 0) AS overall_score,
              CASE WHEN AVG(score) >= 70 THEN 'compliant' ELSE 'non_compliant' END AS status
         FROM compliance_assessments`,
    );
    const frameworksRes = await client.query<{ framework: string; score: string | number; status: string | null }>(
      `SELECT framework, ROUND(AVG(score),1) AS score, MAX(status) AS status
         FROM compliance_assessments
        WHERE framework IS NOT NULL
        GROUP BY framework
        ORDER BY framework`,
    );
    return {
      overallScore: Number(summaryRes.rows[0]?.overall_score ?? 0),
      status: summaryRes.rows[0]?.status ?? 'unknown',
      frameworks: frameworksRes.rows.map((r) => ({
        name: r.framework,
        score: Number(r.score ?? 0),
        status: r.status ?? 'unknown',
      })),
    } as unknown as ComplianceData;
  });
  const rules = await getTenantMaskingRules(tenantId);
  return applyFieldMasking(data, rules);
}

/**
 * Get evidence artifacts for an organization.
 * Validates regulator assignment, applies field masking.
 */
export async function getOrganizationEvidence(
  tenantId: string,
  regulatorUserId: string,
  filters?: { type?: string; status?: string },
): Promise<Evidence[]> {
  await assertAssigned(regulatorUserId, tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters?.type) { params.push(filters.type); conditions.push(`evidence_type = $${params.length}`); }
  if (filters?.status) { params.push(filters.status); conditions.push(`status = $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = await withTenantClient(tenantId, async (client) => {
    const r = await client.query<GenericRow>(
      `SELECT evidence_id, title, evidence_type AS type, status, control_id AS linked_control,
              submitted_at AS uploaded_at, file_path AS file_url
         FROM evidence ${where}
        ORDER BY submitted_at DESC NULLS LAST
        LIMIT 200`,
      params,
    );
    return r.rows;
  });

  const rules = await getTenantMaskingRules(tenantId);
  return rows.map((row) => applyFieldMasking(mapRowToEvidence(row), rules));
}

/**
 * Get a single evidence artifact by ID.
 * Validates regulator assignment, applies field masking.
 */
export async function getEvidenceById(
  tenantId: string,
  regulatorUserId: string,
  evidenceId: string,
): Promise<Evidence> {
  await assertAssigned(regulatorUserId, tenantId);
  const row = await withTenantClient(tenantId, async (client) => {
    const r = await client.query<GenericRow>(
      `SELECT evidence_id, title, evidence_type AS type, status, control_id AS linked_control,
              submitted_at AS uploaded_at, file_path AS file_url
         FROM evidence
        WHERE evidence_id = $1
        LIMIT 1`,
      [evidenceId],
    );
    return r.rows[0] ?? null;
  });
  if (!row) throw new Error(`evidence ${evidenceId} not found in tenant ${tenantId}`);
  const rules = await getTenantMaskingRules(tenantId);
  return applyFieldMasking(mapRowToEvidence(row), rules);
}

/**
 * Submit a regulator inquiry for an organization.
 * Stores in regulator_requests, notifies compliance officer,
 * publishes regulator.request_received event.
 */
export async function submitInquiry(
  tenantId: string,
  regulatorUserId: string,
  inquiry: InquiryInput,
): Promise<Inquiry> {
  await assertAssigned(regulatorUserId, tenantId);
  const requestId = uuid();
  const row = await withTenantClient(tenantId, async (client) => {
    const r = await client.query<GenericRow>(
      `INSERT INTO regulator_requests
         (request_id, regulator_user_id, request_type, subject, body, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING request_id, regulator_user_id, request_type, subject, body, status,
                 response, responded_by, responded_at, created_at`,
      [
        requestId,
        regulatorUserId,
        (inquiry as any).requestType ?? 'inquiry',
        (inquiry as any).subject ?? '',
        (inquiry as any).body ?? '',
      ],
    );
    return r.rows[0]!;
  });

  await createNotification(tenantId, {
    type: 'regulator.request_received',
    title: `Regulator inquiry: ${(inquiry as any).subject ?? requestId}`,
    body: (inquiry as any).body ?? '',
    severity: 'high',
    audience: 'compliance-officer',
  } as any).catch(() => undefined);

  try {
    await eventBus.emit('regulator.request_received', { tenantId, regulatorUserId, requestId });
  } catch { /* best-effort */ }

  const rules = await getTenantMaskingRules(tenantId);
  return applyFieldMasking(mapRowToInquiry(row), rules);
}

/**
 * Get all inquiries for an organization submitted by this regulator.
 * Validates assignment, applies field masking.
 */
export async function getInquiries(
  tenantId: string,
  regulatorUserId: string,
): Promise<Inquiry[]> {
  await assertAssigned(regulatorUserId, tenantId);
  const rows = await withTenantClient(tenantId, async (client) => {
    const r = await client.query<GenericRow>(
      `SELECT request_id, regulator_user_id, request_type, subject, body, status,
              response, responded_by, responded_at, created_at
         FROM regulator_requests
        WHERE regulator_user_id = $1
        ORDER BY created_at DESC
        LIMIT 200`,
      [regulatorUserId],
    );
    return r.rows;
  });
  const rules = await getTenantMaskingRules(tenantId);
  return rows.map((row) => applyFieldMasking(mapRowToInquiry(row), rules));
}

/**
 * Get audit trail entries for an organization.
 * Validates assignment, applies field masking.
 */
export async function getAuditTrail(
  tenantId: string,
  regulatorUserId: string,
): Promise<AuditEntry[]> {
  await assertAssigned(regulatorUserId, tenantId);
  // dos.audit_trail is a platform-shared table; query directly with tenant_id filter
  // rather than via tenant search_path.
  const result = await safeQuery(
    `SELECT entry_id::text AS entry_id, action, actor_id::text AS actor,
            details::text AS details, created_at AS timestamp
       FROM dos.audit_trail
      WHERE tenant_id::text = $1
      ORDER BY created_at DESC
      LIMIT 500`,
    [tenantId],
  );
  const rules = await getTenantMaskingRules(tenantId);
  return result.rows.map((row: GenericRow) => applyFieldMasking(mapRowToAuditEntry(row), rules));
}

/**
 * Get regulatory frameworks for an organization.
 * Validates assignment, applies field masking.
 */
export async function getFrameworks(
  tenantId: string,
  regulatorUserId: string,
): Promise<Framework[]> {
  await assertAssigned(regulatorUserId, tenantId);
  const rows = await withTenantClient(tenantId, async (client) => {
    const r = await client.query<GenericRow>(
      `SELECT f.framework_id, f.name, f.version,
              COUNT(c.control_id)::int AS control_count,
              COALESCE(ROUND(AVG(CASE WHEN c.status = 'compliant' THEN 100 ELSE 0 END), 1), 0) AS coverage_percent
         FROM frameworks f
         LEFT JOIN controls c ON c.framework_id = f.framework_id
        GROUP BY f.framework_id, f.name, f.version
        ORDER BY f.name`,
    );
    return r.rows;
  });
  const rules = await getTenantMaskingRules(tenantId);
  return rows.map((row) => applyFieldMasking(mapRowToFramework(row), rules));
}

/**
 * Draft a regulatory response using the AI gateway.
 * Called by tenant compliance officers to prepare a response to a regulator inquiry.
 */
export async function writeRegulatorResponse(
  tenantId: string,
  requestId: string,
  context: { additionalContext?: string; tone?: string },
): Promise<{ draftResponse: string }> {
  const inquiry = await withTenantClient(tenantId, async (client) => {
    const r = await client.query<{ subject: string; body: string }>(
      `SELECT subject, body FROM regulator_requests WHERE request_id = $1 LIMIT 1`,
      [requestId],
    );
    return r.rows[0] ?? null;
  });
  if (!inquiry) throw new Error(`regulator request ${requestId} not found in tenant ${tenantId}`);

  const tone = context.tone ?? 'formal';
  const prompt = [
    `You are a compliance officer drafting a response to a regulator inquiry.`,
    `Tone: ${tone}.`,
    `Inquiry subject: ${inquiry.subject}`,
    `Inquiry body: ${inquiry.body}`,
    context.additionalContext ? `Additional context: ${context.additionalContext}` : '',
    `Draft a concise, professional response. Do not invent facts; flag any data gaps as "[CITE EVIDENCE]".`,
  ].filter(Boolean).join('\n\n');

  let draftResponse = '';
  try {
    const result = await getAiPort().gatewayComplete(tenantId, { prompt, maxTokens: 1200 });
    draftResponse = typeof result === 'string' ? result : ((result as any)?.text || JSON.stringify(result));
  } catch {
    draftResponse =
      `Thank you for your inquiry regarding "${inquiry.subject}". ` +
      `We are gathering the relevant evidence and will respond with a detailed answer shortly. ` +
      `[CITE EVIDENCE] for specific data points.`;
  }
  return { draftResponse };
}

// ── Row Mappers ────────────────────────────────────────────────────────────

function mapRowToEvidence(row: Record<string, unknown>): Evidence {
  return {

    evidenceId: row.evidence_id as string,

    title: (row.title as string) || '',

    type: (row.type as string) || '',

    status: (row.status as string) || '',
    linkedControl: row.linked_control || null,
    uploadedAt: row.uploaded_at ? new Date((row as any).uploaded_at).toISOString() : new Date().toISOString(),
    fileUrl: row.file_url || null,
  };
}

function mapRowToInquiry(row: Record<string, unknown>): Inquiry {
  return {
    requestId: row.request_id as string,
    regulatorUserId: row.regulator_user_id as string,
    requestType: row.request_type as string,

    subject: row.subject as string,
    body: row.body as string,

    status: (row.status as string) || 'pending',
    response: row.response || null,
    respondedBy: row.responded_by || null,
    respondedAt: row.responded_at ? new Date((row as any).responded_at).toISOString() : null,
    createdAt: row.created_at ? new Date((row as any).created_at).toISOString() : new Date().toISOString(),
  };
}

function mapRowToAuditEntry(row: Record<string, unknown>): AuditEntry {
  return {
    entryId: row.entry_id as string,

    action: (row.action as string) || '',

    actor: (row.actor as string) || '',
    details: row.details as string || '',
    timestamp: row.timestamp ? new Date((row as any).timestamp).toISOString() : new Date().toISOString(),
  };
}

function mapRowToFramework(row: Record<string, unknown>): Framework {
  return {
    frameworkId: row.framework_id as string,

    name: (row.name as string) || '',

    version: (row.version as string) || '',
    controlCount: Number(row.control_count ?? 0),
    coveragePercent: Number(row.coverage_percent ?? 0),
  };
}
