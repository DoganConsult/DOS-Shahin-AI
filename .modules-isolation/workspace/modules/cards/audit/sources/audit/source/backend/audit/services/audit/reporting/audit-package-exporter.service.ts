import { logger } from '../../../ports/logger.port';
// ============================================================
// Audit Package ZIP Exporter
// Generates a ZIP archive containing evidence files, control
// test results, policies, and a JSON manifest organized by
// control domain subdirectories.
// ============================================================

import archiver from 'archiver';
import { emptyResult, query as _query, safeQuery, tenantSchema } from '../../../ports/database.port';
import { downloadEvidenceFile } from '../../../../evidence/services/core/evidence-files.service';
import { listFiles, getFile } from '../../../ports/platform.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import { getClearanceFilterHierarchy } from '../../../../remediation/services/clearance.service';

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface AuditManifestEntry {
  filename: string;
  type: 'evidence' | 'test-result' | 'policy' | 'control';
  controlDomain: string;
  controlRef: string;
  date: string;
  missing?: boolean;
  missingReason?: string;
  /** Internal: entity ID used to fetch the actual file from storage. Not serialized to manifest JSON. */
  _entityId?: string;
  /** Internal: raw file_path from the evidence row (storageKey). Not serialized to manifest JSON. */
  _filePath?: string;
}

export interface AuditManifest {
  generatedAt: string;
  tenantId: string;
  totalFiles: number;
  entries: AuditManifestEntry[];
}

export interface AuditPackageOptions {
  controlDomains?: string[];
  dateRange?: { from: string; to: string };
}

// ── Build Manifest (pure function, exported for PBT) ───────────────────────

export function buildManifest(
  entries: AuditManifestEntry[],
  tenantId: string,
  generatedAt?: string,
): AuditManifest {
  const nonMissing = entries.filter(e => !e.missing);
  // Strip internal fields (_entityId, _filePath) from serialized manifest
  const cleanEntries = entries.map(({ _entityId, _filePath, ...rest }) => rest);
  return {
    generatedAt: generatedAt || new Date().toISOString(),
    tenantId,
    totalFiles: nonMissing.length,
    entries: cleanEntries as AuditManifestEntry[],
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function inferControlDomain(frameworks: string[] | null): string {
  if (!frameworks || frameworks.length === 0) return 'general';
  // Use the first framework as the domain, normalized to kebab-case
  return frameworks[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'general';
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 200);
}

// ── Generate Audit Package ─────────────────────────────────────────────────

export async function generateAuditPackage(
  tenantId: string,
  options?: AuditPackageOptions & { userRole?: string },
): Promise<Buffer> {
  const schema = tenantSchema(tenantId);
  const entries: AuditManifestEntry[] = [];

  // Build parameterized WHERE clauses for date range filtering.
  // Date values are passed as query parameters to prevent SQL injection.
  let evidenceParamIndex = 1;
  const evidenceParams: unknown[] = [];

  let dateFilter = '';
  if (options?.dateRange) {
    dateFilter = ` AND submitted_at >= $${evidenceParamIndex} AND submitted_at <= $${evidenceParamIndex + 1}`;
    evidenceParams.push(options.dateRange.from, options.dateRange.to);
    evidenceParamIndex += 2;
  }

  // P5.5: Build clearance filter for evidence
  let evidenceClearanceFilter = '';
  if (options?.userRole) {
    const clearanceFilter = getClearanceFilterHierarchy(options.userRole, 'confidentiality_level', evidenceParamIndex);
    evidenceClearanceFilter = ` AND ${clearanceFilter.condition}`;
    evidenceParams.push(clearanceFilter.paramValue);
    evidenceParamIndex++;
  }

  // ── 1. Gather evidence files (P5.5: filtered by clearance) ─────────────────────────────────────────────
  const evidenceRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT e.evidence_id, e.title, e.file_path, e.control_id, e.submitted_at,
            c.title AS control_title, c.frameworks
     FROM "${schema}".evidence e
     LEFT JOIN "${schema}".controls c ON e.control_id = c.control_id
     WHERE e.deleted_at IS NULL ${dateFilter}${evidenceClearanceFilter}
     ORDER BY e.submitted_at DESC`,
    evidenceParams.length > 0 ? evidenceParams : undefined
  ), { tenantId: tenantId, operation: 'query evidence' });

  for (const row of evidenceRes.rows) {
    const domain = inferControlDomain((row as any).frameworks);

    // Apply domain filter if specified
    if (options?.controlDomains?.length && !options.controlDomains.includes(domain)) {
      continue;
    }

    const filename = sanitizeFilename((row as any).title || `evidence-${row.evidence_id}`) + '.txt';
    const isMissing = !row.file_path;

    entries.push({
      filename,
      type: 'evidence',
      controlDomain: domain,

      controlRef: row.control_id || 'unlinked',

      date: row.submitted_at?.toISOString?.() || row.submitted_at || new Date().toISOString(),
      ...(isMissing ? { missing: true, missingReason: 'File path not available' } : {}),

      _entityId: row.evidence_id,

      _filePath: row.file_path || undefined,
    });
  }

  // ── 2. Gather control test results (P5.5: filtered by clearance) ───────────────────────────────────────
  let controlsClearanceFilter = '';
  const controlsParams: unknown[] = [];
  let controlsParamIndex = 1;
  if (options?.userRole) {
    const clearanceFilter = getClearanceFilterHierarchy(options.userRole, 'data_classification', controlsParamIndex);
    controlsClearanceFilter = ` AND ${clearanceFilter.condition}`;
    controlsParams.push(clearanceFilter.paramValue);
    controlsParamIndex++;
  }

  const controlsRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT control_id, title, frameworks, test_status, last_tested_at
     FROM "${schema}".controls
     WHERE deleted_at IS NULL AND test_status IS NOT NULL AND test_status != 'not_tested'${controlsClearanceFilter}
     ORDER BY last_tested_at DESC NULLS LAST`,
    controlsParams.length > 0 ? controlsParams : undefined
  ), { tenantId: tenantId, operation: 'query controls' });

  for (const row of controlsRes.rows) {
    const domain = inferControlDomain((row as any).frameworks);

    if (options?.controlDomains?.length && !options.controlDomains.includes(domain)) {
      continue;
    }

    const testDate = row.last_tested_at?.toISOString?.() || row.last_tested_at || new Date().toISOString();

    // Apply date range filter for test results
    if (options?.dateRange) {
      const d = new Date(testDate);
      if (d < new Date(options.dateRange.from) || d > new Date(options.dateRange.to)) continue;
    }

    const filename = sanitizeFilename(`test-result-${row.title || row.control_id}`) + '.json';

    entries.push({
      filename,
      type: 'test-result',
      controlDomain: domain,

      controlRef: row.control_id,
      date: testDate,
    });
  }

  // ── 3. Gather policies ───────────────────────────────────────────────────
  let policyDateFilter = '';
  const policyParams: unknown[] = [];
  if (options?.dateRange) {
    policyDateFilter = ` AND created_at >= $1 AND created_at <= $2`;
    policyParams.push(options.dateRange.from, options.dateRange.to);
  }

  const policiesRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT policy_id, title, version, status, frameworks, owner, created_at
     FROM "${schema}".policies
     WHERE status != 'draft'
     ${policyDateFilter}
     ORDER BY created_at DESC`,
    policyParams.length > 0 ? policyParams : undefined
  ), { tenantId: tenantId, operation: 'query policies' });

  for (const row of policiesRes.rows) {
    const domain = inferControlDomain((row as any).frameworks);

    if (options?.controlDomains?.length && !options.controlDomains.includes(domain)) {
      continue;
    }

    const filename = sanitizeFilename(`policy-${row.title || row.policy_id}-v${row.version}`) + '.txt';

    entries.push({
      filename,
      type: 'policy',
      controlDomain: domain,

      controlRef: row.policy_id,

      date: row.created_at?.toISOString?.() || row.created_at || new Date().toISOString(),

      _entityId: row.policy_id,
    });
  }

  // ── 4. Build manifest and ZIP ────────────────────────────────────────────
  const manifest = buildManifest(entries, tenantId);

  return createZipBuffer(manifest, entries, schema, tenantId);
}

// ── Fetch actual file content for a single entry ─────────────────────────

/**
 * Retrieve the actual file content for an evidence entry from storage.
 * Tries the file_storage table first (via downloadEvidenceFile), then
 * falls back to reading the raw storageKey from the evidence row.
 */
async function fetchEvidenceContent(
  tenantId: string,
  entry: AuditManifestEntry,
): Promise<Buffer> {
  if (!entry._entityId) {
    throw new Error('No evidence ID available for file retrieval');
  }

  // Primary path: use the evidence-files service which handles
  // file_storage table lookup + multi-provider retrieval
  try {
    const result = await downloadEvidenceFile(tenantId, entry._entityId);
    return result.buffer;
  } catch {
    // Fallback: if downloadEvidenceFile fails (e.g. no file_storage row),
    // try retrieving directly via the file_path stored on the evidence row
  }

  if (entry._filePath) {
    return (getFile as any)(entry._filePath);
  }

  throw new Error(`Evidence file not found for evidence ${entry._entityId}`);
}

/**
 * Retrieve the policy document content. Policies store their text in the
 * `content` column of the policies table. If a file attachment exists in
 * file_storage, prefer that; otherwise use the DB text content.
 */
async function fetchPolicyContent(
  tenantId: string,
  schema: string,
  entry: AuditManifestEntry,
): Promise<Buffer> {
  if (!entry._entityId) {
    throw new Error('No policy ID available for document retrieval');
  }

  // Check if the policy has a file attachment in file_storage
  try {

    const files = await listFiles(tenantId, 'policy', (entry as any)._entityId);
    if (files.length > 0) {
      const latest = files[0];
      const buffer = await getFile(latest.fileId, tenantId);

      return buffer;
    }
  } catch {
    // file_storage lookup failed — fall through to DB content
  }

  // Fallback: read the text content column from the policies table
  const result = await safeQuery(
    `SELECT content FROM "${schema}".policies WHERE policy_id = $1`,
    [entry._entityId],
  );

  if (result.rows.length === 0) {
    throw new Error(`Policy ${entry._entityId} not found in database`);
  }

  const textContent = getFirstRow(result)?.content;
  if (!textContent) {
    throw new Error(`Policy ${entry._entityId} has no content`);
  }

  return Buffer.from(textContent, 'utf-8');
}

// ── Create ZIP Buffer ──────────────────────────────────────────────────────

async function createZipBuffer(
  manifest: AuditManifest,
  entries: AuditManifestEntry[],
  schema: string,
  tenantId: string,
): Promise<Buffer> {
  // Pre-fetch all file contents before building the ZIP archive.
  // Each entry maps to its binary content or an error notice.
  // Concurrency is limited to batches of FETCH_CONCURRENCY to avoid
  // overwhelming storage backends with parallel downloads.
  const FETCH_CONCURRENCY = 10;
  const fileContents = new Map<number, { data: Buffer; error?: undefined } | { data?: undefined; error: string }>();

  // Build the list of fetch tasks with their indices
  const fetchTasks: Array<{ idx: number; entry: AuditManifestEntry }> = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.missing || entry.type === 'test-result') continue;
    if (entry.type !== 'evidence' && entry.type !== 'policy') continue;
    fetchTasks.push({ idx: i, entry });
  }

  // Process fetch tasks in batches of FETCH_CONCURRENCY
  for (let batchStart = 0; batchStart < fetchTasks.length; batchStart += FETCH_CONCURRENCY) {
    const batch = fetchTasks.slice(batchStart, batchStart + FETCH_CONCURRENCY);
    await Promise.all(batch.map(async ({ idx, entry }) => {
      try {
        let data: Buffer;
        if (entry.type === 'evidence') {
          data = await fetchEvidenceContent(tenantId, entry);
        } else {
          data = await fetchPolicyContent(tenantId, schema, entry);
        }
        fileContents.set(idx, { data });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`[audit-package] Failed to fetch ${entry.type} file for ${entry._entityId || entry.controlRef}: ${message}`);
        fileContents.set(idx, { error: message });
      }
    }));
  }

  // Build the ZIP archive with fetched content
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 6 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', (err: Error) => reject(err));

    // Add manifest.json at the root
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    // Add files organized by control domain subdirectories
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.missing) continue; // Skip missing files — they're only in the manifest

      const filePath = `${entry.controlDomain}/${entry.filename}`;

      if (entry.type === 'test-result') {
        // Generate a JSON summary for test results (no external file)
        const content = JSON.stringify({
          controlRef: entry.controlRef,
          type: entry.type,
          date: entry.date,
          controlDomain: entry.controlDomain,
        }, null, 2);
        archive.append(content, { name: filePath });
        continue;
      }

      const fetched = fileContents.get(i);

      if (!fetched || fetched.error) {
        // File fetch failed — include a notice file so auditors know
        const notice = [
          `[FILE NOT AVAILABLE]`,
          ``,
          `Type: ${entry.type}`,
          `Control Reference: ${entry.controlRef}`,
          `Domain: ${entry.controlDomain}`,
          `Date: ${entry.date}`,
          `Original Filename: ${entry.filename}`,
          ``,
          `Reason: ${fetched?.error || 'File content could not be retrieved from storage'}`,
        ].join('\n');
        archive.append(notice, { name: filePath });
      } else {
        // Append the actual file content from storage
        archive.append(fetched.data!, { name: filePath });
      }
    }

    archive.finalize();
  });
}
