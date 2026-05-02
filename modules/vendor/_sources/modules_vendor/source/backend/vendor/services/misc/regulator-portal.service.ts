// ============================================
// Shahin — Regulator Portal Service
// Read-only compliance data for regulator
// inspectors with field masking, inquiry
// submission, and AI-drafted responses.
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { createNotification } from '../../../notification/services/notification.service';
import { gatewayComplete } from '../../../ai/services/gateway/ai-gateway.service';
import { randomUUID } from 'node:crypto';
import type {
  Organization,
  ComplianceData,
  Evidence,
  InquiryInput,
  Inquiry,
  AuditEntry,
  Framework,
} from '@dos/types';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

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
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT config_value FROM "${schema}".tenant_config
       WHERE config_key = 'regulator_field_masking'
       LIMIT 1`,
      [],
    );
    if (result.rows.length > 0 && getFirstRow(result)?.config_value) {
      const raw = getFirstRow(result)?.config_value;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    /* no masking config — return empty */
  }
  return [];
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
      const schema = tenantSchema(tid);
      const result = await safeQuery(
        `SELECT tenant_name, compliance_score, status
         FROM "${schema}".tenant_info
         LIMIT 1`,
        [],
      );
      const row = getFirstRow(result)!;
      const maskingRules = await getTenantMaskingRules(tid);
      const org: Organization = {
        tenantId: tid,
        name: row?.tenant_name || tid,
        complianceScore: Number(row?.compliance_score ?? 0),
        status: row?.status || 'active',
      };
      orgs.push(applyFieldMasking(org, maskingRules));
    } catch {
      // Tenant may not have the expected table — skip gracefully
      orgs.push({ tenantId: tid, name: tid, complianceScore: 0, status: 'any' });
    }
  }

  return orgs;
}

/**
 * Get compliance data for a specific organization.
 * Validates regulator assignment before returning data.
 */
export async function getOrganizationCompliance(
  tenantId: string,
  regulatorUserId: string,
): Promise<ComplianceData> {
  const allowed = await validateAssignment(regulatorUserId, tenantId);
  if (!allowed) {
    const e = new Error('Regulator not assigned to this tenant');
    (e as any).statusCode = 403;
    throw e;
  }

  const schema = tenantSchema(tenantId);
  const maskingRules = await getTenantMaskingRules(tenantId);
  const res = await safeQuery(
    `SELECT framework_code, score, controls_total, controls_passing, last_assessed_at
     FROM "${schema}".compliance_summary
     ORDER BY last_assessed_at DESC
     LIMIT 1`,
  ).catch(() => ({ rows: [] as any[] }));

  const row = getFirstRow(res) as Record<string, unknown> | undefined;
  const data: ComplianceData = row
    ? {
        frameworkCode: String((row as any).framework_code ?? ''),
        score: Number((row as any).score ?? 0),
        controlsTotal: Number((row as any).controls_total ?? 0),
        controlsPassing: Number((row as any).controls_passing ?? 0),
        lastAssessedAt: (row as any).last_assessed_at ? new Date((row as any).last_assessed_at).toISOString() : undefined,
      }
    : { score: 0 };

  return applyFieldMasking(data, maskingRules);
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
  const allowed = await validateAssignment(regulatorUserId, tenantId);
  if (!allowed) return [];

  const schema = tenantSchema(tenantId);
  const maskingRules = await getTenantMaskingRules(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.type) { conditions.push(`type = $${idx++}`); params.push(filters.type); }
  if (filters?.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await safeQuery(
    `SELECT * FROM "${schema}".evidence ${where} ORDER BY uploaded_at DESC LIMIT 200`,
    params,
  ).catch(() => ({ rows: [] as any[] }));

  return applyFieldMasking(result.rows.map((r: any) => mapRowToEvidence(r)), maskingRules);
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
  const allowed = await validateAssignment(regulatorUserId, tenantId);
  if (!allowed) {
    const e = new Error('Regulator not assigned to this tenant');
    (e as any).statusCode = 403;
    throw e;
  }

  const schema = tenantSchema(tenantId);
  const maskingRules = await getTenantMaskingRules(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".evidence WHERE evidence_id = $1 LIMIT 1`,
    [evidenceId],
  ).catch(() => ({ rows: [] as any[] }));

  const row = getFirstRow(result) as Record<string, unknown> | undefined;
  if (!row) {
    const e = new Error('Evidence not found');
    (e as any).statusCode = 404;
    throw e;
  }

  return applyFieldMasking(mapRowToEvidence(row), maskingRules);
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
  const allowed = await validateAssignment(regulatorUserId, tenantId);
  if (!allowed) {
    const e = new Error('Regulator not assigned to this tenant');
    (e as any).statusCode = 403;
    throw e;
  }

  const schema = tenantSchema(tenantId);
  const requestId = randomUUID();

  await safeQuery(
    `INSERT INTO "${schema}".regulator_requests
      (request_id, regulator_user_id, request_type, subject, body, status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
    [requestId, regulatorUserId, inquiry.priority ?? 'general', inquiry.subject ?? '', inquiry.body ?? ''],
  ).catch(() => undefined);

  await createNotification(tenantId, {
    type: 'regulator_inquiry_received',
    title: inquiry.subject ?? 'Regulator inquiry',
    body: inquiry.body ?? '',
    requestId,
  }).catch(() => undefined);

  await eventBus.publish(({
    tenantId,
    eventType: 'regulator.request_received',
    severity: 'warning',
    entityType: 'regulator_request',
    entityId: requestId,
    payload: { subject: inquiry.subject, regulatorUserId },
  } as any)).catch(() => undefined);

  return { inquiryId: requestId, subject: inquiry.subject, status: 'pending', createdAt: new Date().toISOString() } as Inquiry;
}

/**
 * Get all inquiries for an organization submitted by this regulator.
 * Validates assignment, applies field masking.
 */
export async function getInquiries(
  tenantId: string,
  regulatorUserId: string,
): Promise<Inquiry[]> {
  const allowed = await validateAssignment(regulatorUserId, tenantId);
  if (!allowed) return [];

  const schema = tenantSchema(tenantId);
  const maskingRules = await getTenantMaskingRules(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".regulator_requests WHERE regulator_user_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [regulatorUserId],
  ).catch(() => ({ rows: [] as any[] }));

  return applyFieldMasking(result.rows.map((r: any) => mapRowToInquiry(r)), maskingRules);
}

/**
 * Get audit trail entries for an organization.
 * Validates assignment, applies field masking.
 */
export async function getAuditTrail(
  tenantId: string,
  regulatorUserId: string,
): Promise<AuditEntry[]> {
  const allowed = await validateAssignment(regulatorUserId, tenantId);
  if (!allowed) return [];

  const schema = tenantSchema(tenantId);
  const maskingRules = await getTenantMaskingRules(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".audit_trail ORDER BY created_at DESC LIMIT 200`,
  ).catch(() => ({ rows: [] as any[] }));

  return applyFieldMasking(result.rows.map((r: any) => mapRowToAuditEntry(r)), maskingRules);
}

/**
 * Get regulatory frameworks for an organization.
 * Validates assignment, applies field masking.
 */
export async function getFrameworks(
  tenantId: string,
  regulatorUserId: string,
): Promise<Framework[]> {
  const allowed = await validateAssignment(regulatorUserId, tenantId);
  if (!allowed) return [];

  const schema = tenantSchema(tenantId);
  const maskingRules = await getTenantMaskingRules(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".frameworks ORDER BY name ASC LIMIT 200`,
  ).catch(() => ({ rows: [] as any[] }));

  return applyFieldMasking(result.rows.map((r: any) => mapRowToFramework(r)), maskingRules);
}

/**
 * Draft a regulatory response using Claude AI.
 * Called by tenant compliance officers to prepare a response to a regulator inquiry.
 */
export async function writeRegulatorResponse(
  tenantId: string,
  requestId: string,
  context: { additionalContext?: string; tone?: string },
): Promise<{ draftResponse: string }> {
  const schema = tenantSchema(tenantId);
  const reqRow = await safeQuery(
    `SELECT subject, body FROM "${schema}".regulator_requests WHERE request_id = $1`,
    [requestId],
  ).catch(() => ({ rows: [] as any[] }));

  const r = getFirstRow(reqRow) as any;
  const prompt =
    `Draft a regulator response.\n\n` +
    `Subject: ${r?.subject ?? ''}\n` +
    `Inquiry: ${r?.body ?? ''}\n\n` +
    `Tone: ${context.tone ?? 'professional'}\n` +
    `${context.additionalContext ? `Additional context: ${context.additionalContext}\n` : ''}`;

  const draftResponse = await gatewayComplete(tenantId, prompt).catch(() => '');
  return { draftResponse: draftResponse || '' };
}

// ── Row Mappers ────────────────────────────────────────────────────────────

function mapRowToEvidence(row: Record<string, unknown>): Evidence {
  return {

    evidenceId: row.evidence_id,

    title: row.title || '',

    type: row.type || '',

    status: row.status || '',
    linkedControl: row.linked_control || null,
    uploadedAt: row.uploaded_at ? new Date((row as any).uploaded_at).toISOString() : new Date().toISOString(),
    fileUrl: row.file_url || null,
  };
}

function mapRowToInquiry(row: Record<string, unknown>): Inquiry {
  return {
    requestId: row.request_id,
    regulatorUserId: row.regulator_user_id,
    requestType: row.request_type,

    subject: row.subject,
    body: row.body,

    status: row.status || 'pending',
    response: row.response || null,
    respondedBy: row.responded_by || null,
    respondedAt: row.responded_at ? new Date((row as any).responded_at).toISOString() : null,
    createdAt: row.created_at ? new Date((row as any).created_at).toISOString() : new Date().toISOString(),
  };
}

function mapRowToAuditEntry(row: Record<string, unknown>): AuditEntry {
  return {
    entryId: row.entry_id,

    action: row.action || '',

    actor: row.actor || '',
    details: row.details || '',
    timestamp: row.timestamp ? new Date((row as any).timestamp).toISOString() : new Date().toISOString(),
  };
}

function mapRowToFramework(row: Record<string, unknown>): Framework {
  return {
    frameworkId: row.framework_id,

    name: row.name || '',

    version: row.version || '',
    controlCount: Number(row.control_count ?? 0),
    coveragePercent: Number(row.coverage_percent ?? 0),
  };
}
