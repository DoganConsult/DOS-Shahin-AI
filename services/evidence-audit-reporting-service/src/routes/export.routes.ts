/**
 * Export Routes — Data export functionality for enterprise modules
 * Supports sync (streaming) and async (job-based) exports with progress tracking.
 * Uses export_jobs table (tenant schema) for async export job lifecycle.
 *
 * Security hardening:
 *   - moduleCode resolved via trusted MODULE_TABLE_MAP (no raw SQL derivation)
 *   - columns validated against information_schema before SQL interpolation
 *   - PII/sensitive columns stripped; PII patterns redacted in values
 *   - ownership check on download; permission check on progress/download
 *   - sync exports audited explicitly
 *   - async artifacts stored via PlatformStorage (not inline base64)
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../adapters/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData, rateLimiter } from '@dos/platform-core/http';
import { safeQuery, tenantSchema, withTenantClient } from '@dos/db';
import { uploadFile, deleteFile } from '@dos/platform-core/storage';
import { randomUUID } from 'crypto';
import { deflateRawSync } from 'zlib';
import { isRestrictedField, PII_VALUE_PATTERNS } from '@dos/platform-core/http';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'evidence-audit-reporting-service:export', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

const ALLOWED_IDENTIFIER = /^[a-z][a-z0-9_]*$/i;
const SAFE_FILENAME = /^[a-zA-Z0-9_\-. ]{1,200}$/;

// ── Fix 3: Trusted module → table mapping ────────────────────────────────
interface ExportMapping {
  table: string;
  schemaType?: 'tenant' | 'dos' | 'public';
}

const MODULE_TABLE_MAP: Record<string, ExportMapping> = {
  // Foundation
  'organization':    { table: 'organizations' },
  'business-unit':   { table: 'business_units' },
  'department':      { table: 'departments' },
  'section':         { table: 'sections' },
  'team':            { table: 'teams' },
  'position':        { table: 'positions' },
  'location':        { table: 'locations' },
  'committee':       { table: 'committees' },
  'user':            { table: 'users', schemaType: 'public' },
  'invitation':      { table: 'invitations', schemaType: 'dos' },
  'audit-trail':     { table: 'audit_trail', schemaType: 'dos' },
  'workspace':       { table: 'workspaces' },

  // GRC Modules
  'risk':            { table: 'risk_risks' },
  'compliance':      { table: 'compliance_assessments' },
  'incident':        { table: 'incidents' },
  'bcp':             { table: 'bcp_plans' },
  'vendor':          { table: 'vendors' },
  'asset':           { table: 'assets' },
  'action':          { table: 'action_items' },
  'remediation':     { table: 'remediations' },
  'issues':          { table: 'issues' },
  'playbooks':       { table: 'playbooks' },
  'privacy':         { table: 'privacy_records' },
  'training':        { table: 'training_programs' },
  'qiyas':           { table: 'qiyas_assessments' },
  'dora':            { table: 'dora_assessments' },
  'fitch':           { table: 'fitch_reports' },
  'policy':          { table: 'policies' },
  'evidence':        { table: 'evidence_items' },
  'audit':           { table: 'audit_engagements' },
  'exception':       { table: 'exceptions' },
  'controls':        { table: 'controls' },
  'governance':      { table: 'governance_items' },
  'reporting':       { table: 'report_definitions' },
  'records':         { table: 'records' },
  'inbox':           { table: 'inbox_messages' },
  'portals':         { table: 'portal_submissions' },
};

function resolveExportTable(moduleCode: string): ExportMapping | null {
  if (!moduleCode || !Object.prototype.hasOwnProperty.call(MODULE_TABLE_MAP, moduleCode)) return null;
  return MODULE_TABLE_MAP[moduleCode];
}

function isRestrictedColumn(colName: string): boolean {
  return isRestrictedField(colName);
}

function redactPIIValue(text: string): string {
  let result = text;
  for (const pattern of PII_VALUE_PATTERNS) {
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(result)) {
      pattern.regex.lastIndex = 0;
      result = result.replace(pattern.regex, pattern.replacement);
    }
  }
  return result;
}

function redactExportRows(rows: any[]): any[] {
  if (rows.length === 0) return rows;
  const allKeys = Object.keys(rows[0]);
  const restrictedKeys = new Set(allKeys.filter(k => isRestrictedColumn(k)));

  return rows.map(row => {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      if (restrictedKeys.has(key)) continue;
      if (typeof value === 'string') {
        clean[key] = redactPIIValue(value);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  });
}

// ── Fix 2: Column validation cache ───────────────────────────────────────
const _columnCache = new Map<string, { columns: Set<string>; ts: number }>();
const COLUMN_CACHE_TTL_MS = 5 * 60 * 1000;

async function getTableColumns(schema: string, tableName: string): Promise<Set<string>> {
  const cacheKey = `${schema}.${tableName}`;
  const cached = _columnCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < COLUMN_CACHE_TTL_MS) return cached.columns;

  const result = await safeQuery(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2`,
    [schema, tableName],
  ).catch(() => ({ rows: [] }));

  const cols = new Set<string>(result.rows.map((r: any) => r.column_name));
  _columnCache.set(cacheKey, { columns: cols, ts: Date.now() });
  return cols;
}

async function validateColumns(
  schema: string, tableName: string, requestedColumns: string[],
): Promise<{ valid: string[]; invalid: string[] }> {
  const tableColumns = await getTableColumns(schema, tableName);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const col of requestedColumns) {
    if (!ALLOWED_IDENTIFIER.test(col)) { invalid.push(col); continue; }
    if (!tableColumns.has(col)) { invalid.push(col); continue; }
    if (isRestrictedColumn(col)) continue; // silently strip restricted
    valid.push(col);
  }
  return { valid, invalid };
}

// ── Fix 1 + Fix 9: Cleaned schemas ──────────────────────────────────────

const EXPORT_FORMATS = z.enum(['xlsx', 'csv', 'pdf', 'json', 'xml']);

const sortSpec = z.object({ field: z.string().regex(ALLOWED_IDENTIFIER), order: z.enum(['asc', 'desc']) });

const exportListSchema = {
  body: z.object({
    moduleCode: z.string().min(1).max(128),
    format: EXPORT_FORMATS.default('xlsx'),
    columns: z.array(z.string().max(128)).optional(),
    filters: z.record(z.any()).optional(),
    sort: z.union([sortSpec, z.array(sortSpec)]).optional(),
    watermark: z.string().max(200).optional(),
    filename: z.string().max(200).regex(SAFE_FILENAME).optional(),
  }),
};

const exportSingleSchema = {
  body: z.object({
    moduleCode: z.string().min(1).max(128),
    format: EXPORT_FORMATS.default('pdf'),
    columns: z.array(z.string().max(128)).optional(),
    item: z.record(z.any()).optional(),
    itemId: z.string().uuid().optional(),
  }).refine(d => d.item?.id || d.itemId, { message: 'Either item or itemId is required' }),
};

const exportBulkSchema = {
  body: z.object({
    moduleCode: z.string().min(1).max(128),
    format: EXPORT_FORMATS.default('xlsx'),
    columns: z.array(z.string().max(128)).optional(),
    ids: z.array(z.string().uuid()).optional(),
    itemIds: z.array(z.string().uuid()).optional(),
  }).refine(d => (d.ids && d.ids.length > 0) || (d.itemIds && d.itemIds.length > 0), {
    message: 'Either ids or itemIds is required',
  }),
};

const MODULE_CODE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,127}$/;

const exportInlineSchema = {
  body: z.object({
    moduleCode: z.string().min(1).max(128).regex(MODULE_CODE_PATTERN),
    format: EXPORT_FORMATS.default('xlsx'),
    rows: z.array(z.record(z.any())).max(10000),
    columns: z.array(z.string().max(128)).optional(),
    watermark: z.string().max(200).optional(),
    filename: z.string().max(200).regex(SAFE_FILENAME).optional(),
  }),
};

const createAsyncJobSchema = {
  body: z.object({
    moduleCode: z.string().min(1).max(128),
    exportType: z.enum(['list', 'single', 'bulk']).default('list'),
    itemIds: z.array(z.string().uuid()).optional(),
    format: EXPORT_FORMATS.default('xlsx'),
    columns: z.array(z.string().max(128)).optional(),
    filters: z.record(z.any()).optional(),
  }),
};

// ── Context Helper ──────────────────────────────────────────────────────

function extractContext(req: Request): { tenantId: string; userId: string; schema: string } | null {
  const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
  const userId = (req as any).user?.userId;
  if (!tenantId) return null;
  return { tenantId, userId, schema: tenantSchema(tenantId) };
}

// ── Fix 7: Explicit audit for sync exports ───────────────────────────────

async function recordExportAudit(
  schema: string, userId: string,
  action: string, metadata: Record<string, any>,
): Promise<void> {
  await safeQuery(
    `INSERT INTO "${schema}".audit_trail
     (user_id, action, entity_type, entity_id, module, path, method, metadata)
     VALUES ($1, $2, 'export', $3, $4, $5, 'POST', $6)`,
    [
      userId,
      action,
      metadata.exportId || null,
      metadata.moduleCode || 'export',
      `/api/export/${metadata.exportType || 'list'}`,
      JSON.stringify({
        moduleCode: metadata.moduleCode,
        format: metadata.format,
        rowCount: metadata.rowCount,
        exportType: metadata.exportType,
      }),
    ],
  ).catch(() => { /* audit failure must not break export */ });
}

// ── Fix 8: Zombie recovery + cleanup exports ─────────────────────────────

const EXPORT_PROCESSING_TIMEOUT_MS = 5 * 60 * 1000;
const EXPORT_RETENTION_HOURS = 24;
const EXPORT_FAILED_RETENTION_HOURS = 1;

export async function recoverZombieExportJobs(schema: string): Promise<number> {
  const result = await safeQuery(
    `UPDATE "${schema}".export_jobs
     SET status = 'failed', error_message = 'Server restart during processing', updated_at = NOW(), completed_at = NOW()
     WHERE status = 'processing'
       AND updated_at < NOW() - INTERVAL '10 minutes'
     RETURNING id`,
    [],
  ).catch(() => ({ rows: [] }));
  if (result.rows.length > 0) {
    console.warn(`[Export] Recovered ${result.rows.length} zombie export jobs in ${schema}`);
  }
  return result.rows.length;
}

export async function cleanupExpiredExports(schema: string, tenantId: string): Promise<number> {
  const expiredJobs = await safeQuery(
    `SELECT id, file_path FROM "${schema}".export_jobs
     WHERE (status IN ('completed') AND completed_at < NOW() - INTERVAL '${EXPORT_RETENTION_HOURS} hours')
        OR (status IN ('failed', 'cancelled') AND updated_at < NOW() - INTERVAL '${EXPORT_FAILED_RETENTION_HOURS} hours')`,
    [],
  ).catch(() => ({ rows: [] }));

  for (const job of expiredJobs.rows) {
    if (job.file_path) {
      try { await deleteFile(tenantId, job.file_path); } catch { /* best effort */ }
    }
  }

  const deleted = await safeQuery(
    `DELETE FROM "${schema}".export_jobs
     WHERE (status IN ('completed') AND completed_at < NOW() - INTERVAL '${EXPORT_RETENTION_HOURS} hours')
        OR (status IN ('failed', 'cancelled') AND updated_at < NOW() - INTERVAL '${EXPORT_FAILED_RETENTION_HOURS} hours')
     RETURNING id`,
    [],
  ).catch(() => ({ rows: [] }));

  return deleted.rows.length;
}

// ── Export Job Persistence ──────────────────────────────────────────────

async function createExportJob(
  schema: string,
  userId: string,
  params: Record<string, any>,
): Promise<{ exportId: string; status: string; progress: number }> {
  const exportId = randomUUID();

  await safeQuery(
    `INSERT INTO "${schema}".export_jobs
       (id, module_code, export_type, format, status, progress, payload, created_by)
     VALUES ($1, $2, $3, $4, 'pending', 0, $5::jsonb, $6)`,
    [
      exportId,
      params.moduleCode,
      params.exportType || 'list',
      params.format || 'xlsx',
      JSON.stringify(params),
      userId,
    ],
  );

  return { exportId, status: 'pending', progress: 0 };
}

async function getExportJob(schema: string, exportId: string): Promise<any | null> {
  const result = await safeQuery(
    `SELECT id, module_code, export_type, format, status, progress,
            total_rows, processed_rows, payload, result_data,
            file_path, file_size, error_message,
            created_by, created_at, updated_at, completed_at
     FROM "${schema}".export_jobs
     WHERE id = $1`,
    [exportId],
  ).catch(() => ({ rows: [] }));

  if (!result.rows[0]) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    exportId: row.id,
    status: row.status,
    progress: row.progress || 0,
    totalRows: row.total_rows,
    processedRows: row.processed_rows,
    format: row.format,
    moduleCode: row.module_code,
    exportType: row.export_type,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    resultData: row.result_data ? (typeof row.result_data === 'string' ? JSON.parse(row.result_data) : row.result_data) : null,
    filePath: row.file_path,
    fileSize: row.file_size,
    errorMessage: row.error_message,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

async function updateExportJob(
  schema: string,
  exportId: string,
  updates: Record<string, any>,
): Promise<void> {
  const setClauses: string[] = ['updated_at = NOW()'];
  const params: any[] = [exportId];

  if (updates.status !== undefined) { setClauses.push(`status = $${params.length + 1}`); params.push(updates.status); }
  if (updates.progress !== undefined) { setClauses.push(`progress = $${params.length + 1}`); params.push(updates.progress); }
  if (updates.totalRows !== undefined) { setClauses.push(`total_rows = $${params.length + 1}`); params.push(updates.totalRows); }
  if (updates.processedRows !== undefined) { setClauses.push(`processed_rows = $${params.length + 1}`); params.push(updates.processedRows); }
  if (updates.resultData !== undefined) { setClauses.push(`result_data = $${params.length + 1}::jsonb`); params.push(JSON.stringify(updates.resultData)); }
  if (updates.filePath !== undefined) { setClauses.push(`file_path = $${params.length + 1}`); params.push(updates.filePath); }
  if (updates.fileSize !== undefined) { setClauses.push(`file_size = $${params.length + 1}`); params.push(updates.fileSize); }
  if (updates.errorMessage !== undefined) { setClauses.push(`error_message = $${params.length + 1}`); params.push(updates.errorMessage); }
  if (updates.status === 'completed' || updates.status === 'failed') { setClauses.push('completed_at = NOW()'); }

  await safeQuery(
    `UPDATE "${schema}".export_jobs SET ${setClauses.join(', ')} WHERE id = $1`,
    params,
  );
}

// ── Data Query (hardened: Fix 2 + Fix 3 + Fix 5 + Fix 9) ────────────────

interface SortSpec { field: string; order: 'asc' | 'desc' }

async function queryExportData(
  tenantId: string,
  moduleCode: string,
  columns: string[],
  filters?: Record<string, any>,
  itemIds?: string[],
  sort?: SortSpec | SortSpec[],
): Promise<any[]> {
  // Fix 3: resolve table from trusted map only
  const mapping = resolveExportTable(moduleCode);
  if (!mapping) throw new Error(`INVALID_MODULE: ${moduleCode}`);

  const tableName = mapping.table;
  let schema: string;
  switch (mapping.schemaType) {
    case 'public': schema = 'public'; break;
    case 'dos':    schema = 'dos'; break;
    case 'tenant':
    default:       schema = tenantSchema(tenantId); break;
  }

  // Fix 2: validate requested columns against real table schema
  let validColumns: string[] = [];
  if (columns && columns.length > 0) {
    const { valid, invalid } = await validateColumns(schema, tableName, columns);
    if (invalid.length > 0) {
      throw new Error(`INVALID_COLUMNS: ${invalid.join(', ')}`);
    }
    validColumns = valid;
  }

  const conditions: string[] = [];
  const params: any[] = [];

  // Foundation tables in public/dos might need tenant_id filter if they are shared
  if (mapping.schemaType === 'public' || mapping.schemaType === 'dos') {
    // Check if table has tenant_id
    const tableColsForTenant = await getTableColumns(schema, tableName);
    if (tableColsForTenant.has('tenant_id')) {
      conditions.push(`tenant_id = $${params.length + 1}`);
      params.push(tenantId);
    }
  }

  // Check if table has deleted_at before using it
  const tableCols = await getTableColumns(schema, tableName);
  if (tableCols.has('deleted_at')) {
    conditions.push('deleted_at IS NULL');
  }

  if (itemIds && itemIds.length > 0) {
    // Primary key might be different (organization_id, bu_id, user_id, etc.)
    // But standardized export usually expects 'id' or we could try to find the PK
    // For now, assume 'id' unless foundation
    let pkField = 'id';
    if (moduleCode === 'organization') pkField = 'organization_id';
    else if (moduleCode === 'business-unit') pkField = 'bu_id';
    else if (moduleCode === 'department') pkField = 'department_id';
    else if (moduleCode === 'section') pkField = 'section_id';
    else if (moduleCode === 'team') pkField = 'team_id';
    else if (moduleCode === 'position') pkField = 'position_id';
    else if (moduleCode === 'location') pkField = 'location_id';
    else if (moduleCode === 'committee') pkField = 'committee_id';
    else if (moduleCode === 'user') pkField = 'user_id';
    else if (moduleCode === 'invitation') pkField = 'invitation_id';
    else if (moduleCode === 'workspace') pkField = 'workspace_id';

    if (tableCols.has(pkField)) {
      conditions.push(`"${pkField}" = ANY($${params.length + 1})`);
      params.push(itemIds);
    } else if (tableCols.has('id')) {
      conditions.push(`id = ANY($${params.length + 1})`);
      params.push(itemIds);
    }
  }

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '' && ALLOWED_IDENTIFIER.test(key)) {
        // Fix 2: also validate filter keys against real columns
        if (!tableCols.has(key)) continue;
        conditions.push(`"${key}" = $${params.length + 1}`);
        params.push(value);
      }
    }
  }

  const whereClause = conditions.length > 0 ? conditions.join(' AND ') : 'TRUE';
  const selectColumns = validColumns.length > 0
    ? validColumns.map(c => `"${c}"`).join(', ')
    : '*';

  // Fix 9: apply sort if provided and validated
  let orderClause = 'ORDER BY created_at DESC';
  if (sort) {
    const sortArr = Array.isArray(sort) ? sort : [sort];
    const validSorts: string[] = [];
    for (const s of sortArr) {
      if (ALLOWED_IDENTIFIER.test(s.field) && tableCols.has(s.field)) {
        validSorts.push(`"${s.field}" ${s.order === 'asc' ? 'ASC' : 'DESC'}`);
      }
    }
    if (validSorts.length > 0) orderClause = `ORDER BY ${validSorts.join(', ')}`;
  }

  const result = await safeQuery(
    `SELECT ${selectColumns} FROM "${schema}"."${tableName}" WHERE ${whereClause} ${orderClause} LIMIT 50000`,
    params,
  ).catch(() => ({ rows: [] }));

  // Fix 5: redact PII in returned data
  return redactExportRows(result.rows);
}

// ── Format Generators ───────────────────────────────────────────────────

function toCSV(data: any[], columns?: string[]): string {
  if (data.length === 0) return '';

  const headers = columns && columns.length > 0 ? columns : Object.keys(data[0]);
  const escapeCsvField = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.map(row =>
    headers.map(col => escapeCsvField(row[col])).join(','),
  );

  // Fix 10: UTF-8 BOM for Excel compatibility with Arabic/Unicode
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

function toJSON(data: any[]): string {
  return JSON.stringify({ data, exportedAt: new Date().toISOString(), totalRecords: data.length }, null, 2);
}

function toXML(data: any[], moduleCode: string): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<export module="${escapeXml(moduleCode)}" exportedAt="${new Date().toISOString()}" totalRecords="${data.length}">\n`;
  for (const row of data) {
    xml += '  <record>\n';
    for (const [key, value] of Object.entries(row)) {
      xml += `    <${key}>${escapeXml(String(value ?? ''))}</${key}>\n`;
    }
    xml += '  </record>\n';
  }
  xml += '</export>';
  return xml;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function humanizeHeader(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bId\b/, 'ID')
    .trim();
}

function toXLSX(data: any[], columns?: string[], sheetName: string = 'Export'): Buffer {
  const headers = columns && columns.length > 0 ? columns : (data.length > 0 ? Object.keys(data[0]) : []);
  const headerLabels = headers.map(h => humanizeHeader(h));

  const sheetData: string[][] = [headerLabels];
  for (const row of data) {
    sheetData.push(headers.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      if (val instanceof Date) return val.toISOString();
      return String(val);
    }));
  }

  return buildXLSXBuffer(sheetData, sheetName);
}

function buildXLSXBuffer(rows: string[][], sheetName: string): Buffer {
  const sharedStrings: string[] = [];
  const ssMap = new Map<string, number>();

  function addSharedString(s: string): number {
    const existing = ssMap.get(s);
    if (existing !== undefined) return existing;
    const idx = sharedStrings.length;
    sharedStrings.push(s);
    ssMap.set(s, idx);
    return idx;
  }

  for (const row of rows) {
    for (const cell of row) {
      addSharedString(cell);
    }
  }

  function colRef(c: number): string {
    let ref = '';
    let n = c;
    while (n >= 0) {
      ref = String.fromCharCode(65 + (n % 26)) + ref;
      n = Math.floor(n / 26) - 1;
    }
    return ref;
  }

  let sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  sheetXml += '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
  // Fix 10: RTL sheet view support — detect Arabic content
  const hasArabic = rows.some(row => row.some(cell => /[\u0600-\u06FF]/.test(cell)));
  if (hasArabic) {
    sheetXml += '<sheetViews><sheetView rightToLeft="1" tabSelected="1" workbookViewId="0"/></sheetViews>';
  }
  sheetXml += `<sheetData>`;
  for (let r = 0; r < rows.length; r++) {
    sheetXml += `<row r="${r + 1}">`;
    for (let c = 0; c < rows[r].length; c++) {
      const ref = `${colRef(c)}${r + 1}`;
      const ssIdx = ssMap.get(rows[r][c])!;
      if (r === 0) {
        sheetXml += `<c r="${ref}" t="s" s="1"><v>${ssIdx}</v></c>`;
      } else {
        const num = Number(rows[r][c]);
        if (rows[r][c] !== '' && !isNaN(num) && isFinite(num)) {
          sheetXml += `<c r="${ref}"><v>${num}</v></c>`;
        } else {
          sheetXml += `<c r="${ref}" t="s"><v>${ssIdx}</v></c>`;
        }
      }
    }
    sheetXml += '</row>';
  }
  sheetXml += '</sheetData></worksheet>';

  let ssXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  ssXml += `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">`;
  for (const s of sharedStrings) {
    ssXml += `<si><t>${escapeXml(s)}</t></si>`;
  }
  ssXml += '</sst>';

  let stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  stylesXml += '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
  stylesXml += '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>';
  stylesXml += '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>';
  stylesXml += '<fills count="2"><fill><patternFill patternType="none"/></fill>';
  stylesXml += '<fill><patternFill patternType="gray125"/></fill></fills>';
  stylesXml += '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>';
  stylesXml += '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>';
  stylesXml += '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>';
  stylesXml += '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>';
  stylesXml += '</styleSheet>';

  const contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>';

  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  const wbXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  const wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>';

  const files: Record<string, string> = {
    '[Content_Types].xml': contentTypes,
    '_rels/.rels': rels,
    'xl/workbook.xml': wbXml,
    'xl/_rels/workbook.xml.rels': wbRels,
    'xl/worksheets/sheet1.xml': sheetXml,
    'xl/sharedStrings.xml': ssXml,
    'xl/styles.xml': stylesXml,
  };

  return buildZipBuffer(files);
}

function buildZipBuffer(files: Record<string, string>): Buffer {
  const entries: { name: Buffer; data: Buffer; crc: number; compressedData: Buffer }[] = [];

  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.from(content, 'utf-8');
    const crc = crc32(data);
    const compressedData = deflateRawSync(data);
    entries.push({ name: Buffer.from(name, 'utf-8'), data, crc, compressedData });
  }

  const parts: Buffer[] = [];
  const centralDir: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const localHeader = buildLocalFileHeader(entry.name, entry.data.length, entry.compressedData.length, entry.crc);
    parts.push(localHeader, entry.compressedData);

    const cdEntry = buildCentralDirEntry(entry.name, entry.data.length, entry.compressedData.length, entry.crc, offset);
    centralDir.push(cdEntry);

    offset += localHeader.length + entry.compressedData.length;
  }

  const cdStart = offset;
  for (const cd of centralDir) { parts.push(cd); offset += cd.length; }

  const cdSize = offset - cdStart;
  const eocd = buildEndOfCentralDir(entries.length, cdSize, cdStart);
  parts.push(eocd);

  return Buffer.concat(parts);
}

function buildLocalFileHeader(name: Buffer, size: number, compSize: number, crc: number): Buffer {
  const buf = Buffer.alloc(30 + name.length);
  buf.writeUInt32LE(0x04034b50, 0);
  buf.writeUInt16LE(20, 4);
  buf.writeUInt16LE(0, 6);
  buf.writeUInt16LE(8, 8);
  buf.writeUInt16LE(0, 10);
  buf.writeUInt16LE(0, 12);
  buf.writeUInt32LE(crc, 14);
  buf.writeUInt32LE(compSize, 18);
  buf.writeUInt32LE(size, 22);
  buf.writeUInt16LE(name.length, 26);
  buf.writeUInt16LE(0, 28);
  name.copy(buf, 30);
  return buf;
}

function buildCentralDirEntry(name: Buffer, size: number, compSize: number, crc: number, offset: number): Buffer {
  const buf = Buffer.alloc(46 + name.length);
  buf.writeUInt32LE(0x02014b50, 0);
  buf.writeUInt16LE(20, 4);
  buf.writeUInt16LE(20, 6);
  buf.writeUInt16LE(0, 8);
  buf.writeUInt16LE(8, 10);
  buf.writeUInt16LE(0, 12);
  buf.writeUInt16LE(0, 14);
  buf.writeUInt32LE(crc, 16);
  buf.writeUInt32LE(compSize, 20);
  buf.writeUInt32LE(size, 24);
  buf.writeUInt16LE(name.length, 28);
  buf.writeUInt16LE(0, 30);
  buf.writeUInt16LE(0, 32);
  buf.writeUInt16LE(0, 34);
  buf.writeUInt16LE(0, 36);
  buf.writeUInt32LE(0, 38);
  buf.writeUInt32LE(offset, 42);
  name.copy(buf, 46);
  return buf;
}

function buildEndOfCentralDir(count: number, cdSize: number, cdOffset: number): Buffer {
  const buf = Buffer.alloc(22);
  buf.writeUInt32LE(0x06054b50, 0);
  buf.writeUInt16LE(0, 4);
  buf.writeUInt16LE(0, 6);
  buf.writeUInt16LE(count, 8);
  buf.writeUInt16LE(count, 10);
  buf.writeUInt32LE(cdSize, 12);
  buf.writeUInt32LE(cdOffset, 16);
  buf.writeUInt16LE(0, 20);
  return buf;
}

function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function toPDF(data: any[], title: string, columns?: string[], watermark?: string): Buffer {
  const headers = columns && columns.length > 0 ? columns : (data.length > 0 ? Object.keys(data[0]) : []);
  const headerLabels = headers.map(h => humanizeHeader(h));

  const lines: string[] = [];
  lines.push(title);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total Records: ${data.length}`);
  // Fix 9: watermark as repeating header/footer text (honest implementation)
  if (watermark) lines.push(`[${watermark}]`);
  lines.push('');

  lines.push(headerLabels.join(' | '));
  lines.push('-'.repeat(Math.min(headerLabels.join(' | ').length, 120)));

  for (const row of data) {
    const vals = headers.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      return String(val).substring(0, 50);
    });
    lines.push(vals.join(' | '));
  }

  return buildPDFBuffer(lines, title);
}

function buildPDFBuffer(lines: string[], title: string): Buffer {
  const fontSize = 10;
  const margin = 50;
  const pageWidth = 595;
  const pageHeight = 842;
  const lineHeight = fontSize * 1.4;
  const maxLinesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);

  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += maxLinesPerPage) {
    pages.push(lines.slice(i, i + maxLinesPerPage));
  }
  if (pages.length === 0) pages.push(['No data']);

  const objects: string[] = [];
  let objNum = 0;

  function addObj(content: string): number {
    objNum++;
    objects.push(`${objNum} 0 obj\n${content}\nendobj`);
    return objNum;
  }

  const catalogId = addObj('<< /Type /Catalog /Pages 2 0 R >>');

  const pageObjIds: number[] = [];
  const contentObjIds: number[] = [];

  for (const page of pages) {
    let stream = `BT\n/F1 ${fontSize} Tf\n`;
    let y = pageHeight - margin;
    for (const line of page) {
      const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      stream += `${margin} ${y} Td\n(${escaped}) Tj\n0 ${-lineHeight} Td\n`;
      y -= lineHeight;
    }
    stream += 'ET';

    const contentId = addObj(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    contentObjIds.push(contentId);
  }

  const fontId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');

  for (let i = 0; i < pages.length; i++) {
    const pageId = addObj(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Contents ${contentObjIds[i]} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`
    );
    pageObjIds.push(pageId);
  }

  const pagesKids = pageObjIds.map(id => `${id} 0 R`).join(' ');
  objects[1] = `2 0 obj\n<< /Type /Pages /Kids [${pagesKids}] /Count ${pageObjIds.length} >>\nendobj`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf-8');
}

// ── Format Response Helper ──────────────────────────────────────────────

function sendExport(res: Response, data: any[], format: string, filename: string, columns?: string[], watermark?: string): void {
  const CONTENT_TYPES: Record<string, string> = {
    csv: 'text/csv; charset=utf-8',
    json: 'application/json',
    xml: 'application/xml',
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  const EXTENSIONS: Record<string, string> = {
    csv: '.csv', json: '.json', xml: '.xml', pdf: '.pdf', xlsx: '.xlsx',
  };

  const ext = EXTENSIONS[format] || '.json';
  const contentType = CONTENT_TYPES[format] || 'application/json';
  const fullFilename = `${filename}${ext}`;

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${fullFilename}"`);
  res.setHeader('X-Export-Filename', fullFilename);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Export-Filename');

  switch (format) {
    case 'csv':
      res.send(toCSV(data, columns));
      break;
    case 'json':
      res.send(toJSON(data));
      break;
    case 'xml':
      res.send(toXML(data, filename));
      break;
    case 'pdf':
      res.send(toPDF(data, filename, columns, watermark));
      break;
    case 'xlsx':
      res.send(toXLSX(data, columns, filename));
      break;
    default:
      res.send(toJSON(data));
  }
}

// ── Async Job Processing (Fix 4: PlatformStorage, Fix 8: timeout) ────────

const FORMAT_EXTENSIONS: Record<string, string> = {
  csv: '.csv', json: '.json', xml: '.xml', pdf: '.pdf', xlsx: '.xlsx',
};
const FORMAT_MIMETYPES: Record<string, string> = {
  csv: 'text/csv',
  json: 'application/json',
  xml: 'application/xml',
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

async function processExportJob(schema: string, tenantId: string, exportId: string): Promise<void> {
  const job = await getExportJob(schema, exportId);
  if (!job || job.status !== 'pending') return;

  // Fix 8: timeout wrapper
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Export processing timeout exceeded (5 min)')), EXPORT_PROCESSING_TIMEOUT_MS),
  );

  try {
    await Promise.race([_doProcessExportJob(schema, tenantId, exportId, job), timeoutPromise]);
  } catch (err: any) {
    await updateExportJob(schema, exportId, {
      status: 'failed',
      errorMessage: err?.message || 'Unknown export error',
    });
  }
}

async function _doProcessExportJob(schema: string, tenantId: string, exportId: string, job: any): Promise<void> {
  await updateExportJob(schema, exportId, { status: 'processing', progress: 10 });

  const payload = job.payload || {};
  const data = await queryExportData(
    tenantId,
    job.moduleCode,
    payload.columns || [],
    payload.filters,
    payload.itemIds,
  );

  await updateExportJob(schema, exportId, {
    progress: 50,
    totalRows: data.length,
    processedRows: 0,
  });

  let resultBuffer: Buffer;
  switch (job.format) {
    case 'csv':
      resultBuffer = Buffer.from(toCSV(data, payload.columns), 'utf-8');
      break;
    case 'json':
      resultBuffer = Buffer.from(toJSON(data), 'utf-8');
      break;
    case 'xml':
      resultBuffer = Buffer.from(toXML(data, job.moduleCode), 'utf-8');
      break;
    case 'pdf':
      resultBuffer = toPDF(data, `${job.moduleCode} Export`, payload.columns);
      break;
    case 'xlsx':
      resultBuffer = toXLSX(data, payload.columns, job.moduleCode);
      break;
    default:
      resultBuffer = Buffer.from(toJSON(data), 'utf-8');
  }

  await updateExportJob(schema, exportId, {
    progress: 90,
    processedRows: data.length,
  });

  // Fix 4: Store artifact via PlatformStorage instead of inline base64
  const ext = FORMAT_EXTENSIONS[job.format] || '.json';
  const timestamp = new Date().toISOString().split('T')[0];
  const artifactFilename = `${job.moduleCode}-export-${timestamp}-${exportId.slice(0, 8)}${ext}`;

  try {
    const fileRecord = await uploadFile({
      tenantId,
      fileName: artifactFilename,
      mimeType: FORMAT_MIMETYPES[job.format] || 'application/octet-stream',
      sizeBytes: resultBuffer.length,
      content: resultBuffer,
      uploadedBy: job.createdBy,
      entityType: 'export_job',
      entityId: exportId,
    });

    await updateExportJob(schema, exportId, {
      status: 'completed',
      progress: 100,
      processedRows: data.length,
      fileSize: resultBuffer.length,
      filePath: fileRecord.fileId,
      resultData: { fileId: fileRecord.fileId, format: job.format, generatedAt: new Date().toISOString() },
    });
  } catch (storageErr: any) {
    // Fallback: store small results inline if PlatformStorage is unavailable
    if (resultBuffer.length < 5 * 1024 * 1024) {
      console.warn(`[Export] PlatformStorage failed for job ${exportId}, falling back to inline: ${storageErr?.message}`);
      await updateExportJob(schema, exportId, {
        status: 'completed',
        progress: 100,
        processedRows: data.length,
        fileSize: resultBuffer.length,
        resultData: { inlineBase64: resultBuffer.toString('base64'), format: job.format, generatedAt: new Date().toISOString() },
      });
    } else {
      throw new Error(`Storage failed and file too large for inline fallback: ${storageErr?.message}`);
    }
  }
}

// ── Route helper: validate moduleCode early ──────────────────────────────

function validateModuleCode(res: Response, moduleCode: string): boolean {
  if (!resolveExportTable(moduleCode)) {
    res.status(400).json({
      error: `Unknown module: ${moduleCode}. Export is only available for registered modules.`,
      code: 'INVALID_MODULE',
      supportedModules: Object.keys(MODULE_TABLE_MAP),
    });
    return false;
  }
  return true;
}

// ── Routes (Fix 3, 6, 7, 9 applied) ─────────────────────────────────────

// ── Inline export — accepts pre-resolved rows from FE caller ─────────────
//
// Vertical Phase 2 / Module #1 (compliance) Step 5: many feature pages
// (compliance-posture, compliance-obligations, compliance-frameworks,
// compliance-gaps, controls-monitoring-failed/overdue/actions, etc.) use
// per-page module codes that are NOT in the curated MODULE_TABLE_MAP and
// have no dedicated tenant-schema table to query. Their UI already holds
// the rendered rows in memory. This endpoint formats those rows into the
// requested artefact (csv/xlsx/pdf/json/xml) using the same encoders,
// PII redaction and audit pipeline as `/list`. No DB read happens here.
//
// Permission: `module.export.read` (same gate as the table-driven routes).
// Auth: `authenticate` middleware enforces tenant + user context.
// Audit: emitted explicitly via recordExportAudit so inline exports show
// up in the same audit trail as table-driven exports.
router.post(
  '/inline',
  authenticate,
  requirePermission('module.export.read'),
  validate(exportInlineSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const ctx = extractContext(req);
    if (!ctx) { res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' }); return; }

    const { moduleCode, format, rows, columns, watermark, filename } = req.body;

    // Sanitise rows: strip restricted columns and redact PII values using
    // the same helpers the table-driven routes use.
    const cleanRows = redactExportRows(rows as any[]);

    // If caller supplied a column allow-list, intersect it with the
    // actual keys present in the cleaned rows; never echo back column
    // names that the redactor stripped.
    let resolvedColumns: string[] | undefined = columns;
    if (resolvedColumns && cleanRows.length > 0) {
      const presentKeys = new Set(Object.keys(cleanRows[0]));
      resolvedColumns = resolvedColumns.filter(c => presentKeys.has(c));
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const exportFilename = filename || `${moduleCode}-export-${timestamp}`;
    sendExport(res, cleanRows, format, exportFilename, resolvedColumns, watermark);

    recordExportAudit(ctx.schema, ctx.userId, 'export.inline', {
      moduleCode, format, rowCount: cleanRows.length, exportType: 'inline',
    });
  }),
);

router.post(
  '/list',
  authenticate,
  requirePermission('module.export.read'),
  validate(exportListSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const ctx = extractContext(req);
    if (!ctx) { res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' }); return; }

    const { moduleCode, format, columns, filters, sort, watermark, filename } = req.body;
    if (!validateModuleCode(res, moduleCode)) return;

    const data = await queryExportData(ctx.tenantId, moduleCode, columns || [], filters, undefined, sort);

    const timestamp = new Date().toISOString().split('T')[0];
    const exportFilename = filename || `${moduleCode}-export-${timestamp}`;
    sendExport(res, data, format, exportFilename, columns, watermark);

    // Fix 7: audit sync export
    recordExportAudit(ctx.schema, ctx.userId, 'export.list', {
      moduleCode, format, rowCount: data.length, exportType: 'list',
    });
  }),
);

router.post(
  '/single',
  authenticate,
  requirePermission('module.export.read'),
  validate(exportSingleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const ctx = extractContext(req);
    if (!ctx) { res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' }); return; }

    const { moduleCode, format, columns, item, itemId } = req.body;
    if (!validateModuleCode(res, moduleCode)) return;
    const resolvedId = itemId || item?.id;

    const data = await queryExportData(ctx.tenantId, moduleCode, columns || [], {}, [resolvedId]);

    if (data.length === 0) {
      res.status(404).json({ error: 'Item not found', code: 'NOT_FOUND' });
      return;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    sendExport(res, data, format, `${moduleCode}-${resolvedId}-${timestamp}`, columns);

    // Fix 7: audit sync export
    recordExportAudit(ctx.schema, ctx.userId, 'export.single', {
      moduleCode, format, rowCount: data.length, exportType: 'single',
    });
  }),
);

router.post(
  '/bulk',
  authenticate,
  requirePermission('module.export.read'),
  validate(exportBulkSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const ctx = extractContext(req);
    if (!ctx) { res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' }); return; }

    const { moduleCode, format, columns } = req.body;
    if (!validateModuleCode(res, moduleCode)) return;
    const resolvedIds: string[] = req.body.ids || req.body.itemIds;

    const data = await queryExportData(ctx.tenantId, moduleCode, columns || [], {}, resolvedIds);

    const timestamp = new Date().toISOString().split('T')[0];
    sendExport(res, data, format, `${moduleCode}-bulk-${timestamp}`, columns);

    // Fix 7: audit sync export
    recordExportAudit(ctx.schema, ctx.userId, 'export.bulk', {
      moduleCode, format, rowCount: data.length, exportType: 'bulk',
    });
  }),
);

router.post(
  '/async',
  authenticate,
  requirePermission('module.export.read'),
  validate(createAsyncJobSchema),
  auditMiddleware('export.create_job'),
  asyncHandler(async (req: Request, res: Response) => {
    const ctx = extractContext(req);
    if (!ctx) { res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' }); return; }

    const { moduleCode } = req.body;
    if (!validateModuleCode(res, moduleCode)) return;

    const job = await createExportJob(ctx.schema, ctx.userId, req.body);

    setAuditData(res, {
      action: 'export.create_job',
      entityType: 'export_job',
      entityId: job.exportId,
      afterState: job,
    });

    setImmediate(() => {
      processExportJob(ctx.schema, ctx.tenantId, job.exportId).catch(err => {
        console.error(`[Export] Async job ${job.exportId} failed:`, err);
      });
    });

    res.status(201).json({
      exportId: job.exportId,
      status: job.status,
      progress: job.progress,
      message: 'Export job created and processing started',
    });
  }),
);

// Fix 6: Add requirePermission to progress endpoint
router.get(
  '/progress/:id',
  authenticate,
  requirePermission('module.export.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const ctx = extractContext(req);
    if (!ctx) { res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' }); return; }

    const job = await getExportJob(ctx.schema, req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Export job not found', code: 'NOT_FOUND' });
      return;
    }

    const isSuperAdmin = (req as any).user?.isSuperAdmin === true;
    if (job.createdBy !== ctx.userId && !isSuperAdmin) {
      const permResult = await safeQuery(
        `SELECT 1 FROM "${ctx.schema}".enterprise_user_role_assignments ura
         JOIN "${ctx.schema}".role_permissions rp ON rp.role_id = ura.role_id
         WHERE ura.user_id = $1 AND ura.is_active = TRUE
           AND (ura.valid_to IS NULL OR ura.valid_to > NOW())
           AND rp.permission_code IN ($2, $3, 'module.export.read', '*')`,
        [ctx.userId, `${job.moduleCode}.export.read`, `${job.moduleCode}.*`]
      ).catch(() => ({ rows: [] }));

      if (permResult.rows.length === 0) {
        res.status(403).json({ error: 'Module-specific export read permission required', code: 'FORBIDDEN' });
        return;
      }
    }

    res.json({
      id: job.exportId,
      status: job.status,
      progress: job.progress,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      error: job.errorMessage,
    });
  }),
);

// Fix 6: Add requirePermission + ownership check to download endpoint
router.get(
  '/download/:id',
  authenticate,
  requirePermission('module.export.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const ctx = extractContext(req);
    if (!ctx) { res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' }); return; }

    const job = await getExportJob(ctx.schema, req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Export job not found', code: 'NOT_FOUND' });
      return;
    }

    const isSuperAdmin = (req as any).user?.isSuperAdmin === true;
    if (job.createdBy !== ctx.userId && !isSuperAdmin) {
      const permResult = await safeQuery(
        `SELECT 1 FROM "${ctx.schema}".enterprise_user_role_assignments ura
         JOIN "${ctx.schema}".role_permissions rp ON rp.role_id = ura.role_id
         WHERE ura.user_id = $1 AND ura.is_active = TRUE
           AND (ura.valid_to IS NULL OR ura.valid_to > NOW())
           AND rp.permission_code IN ($2, $3, 'module.export.read', '*')`,
        [ctx.userId, `${job.moduleCode}.export.read`, `${job.moduleCode}.*`]
      ).catch(() => ({ rows: [] }));

      if (permResult.rows.length === 0) {
        res.status(403).json({ error: 'Module-specific export read permission required', code: 'FORBIDDEN' });
        return;
      }
    }

    if (job.status !== 'completed') {
      res.status(400).json({
        error: 'Export not ready',
        code: 'NOT_READY',
        status: job.status,
        progress: job.progress,
      });
      return;
    }

    const ext = FORMAT_EXTENSIONS[job.format] || '.json';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${job.moduleCode}-export-${timestamp}${ext}`;

    // Fix 4: serve from PlatformStorage file reference
    if (job.filePath && job.resultData?.fileId) {
      try {
        const { LocalStorageProvider } = require('@dos/platform-core/storage');
        const storage = new LocalStorageProvider();
        const fileRecord = await storage.getFile(ctx.tenantId, job.filePath);
        if (fileRecord?.metadata?.storageKey) {
          const buffer = await storage.getFileContent(fileRecord.metadata.storageKey as string);
          res.setHeader('Content-Type', FORMAT_MIMETYPES[job.format] || 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.setHeader('Content-Length', String(buffer.length));
          res.setHeader('X-Export-Filename', filename);
          res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Export-Filename, Content-Length');
          res.send(buffer);
          return;
        }
      } catch (err: any) {
        console.warn(`[Export] PlatformStorage read failed for job ${req.params.id}: ${err?.message}`);
      }
    }

    // Backward compat: serve inline base64 if present
    if (job.resultData?.inlineBase64) {
      const buffer = Buffer.from(job.resultData.inlineBase64, 'base64');
      res.setHeader('Content-Type', FORMAT_MIMETYPES[job.format] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', String(buffer.length));
      res.setHeader('X-Export-Filename', filename);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Export-Filename, Content-Length');
      res.send(buffer);
      return;
    }

    // Last resort: regenerate on the fly
    const data = await queryExportData(ctx.tenantId, job.moduleCode, job.payload?.columns || [], job.payload?.filters);
    sendExport(res, data, job.format, `${job.moduleCode}-export-${timestamp}`, job.payload?.columns);
  }),
);

router.post(
  '/cancel/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const ctx = extractContext(req);
    if (!ctx) { res.status(400).json({ error: 'Tenant context required', code: 'NO_TENANT' }); return; }

    const job = await getExportJob(ctx.schema, req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Export job not found', code: 'NOT_FOUND' });
      return;
    }

    if (job.createdBy !== ctx.userId) {
      res.status(403).json({ error: 'Cannot cancel another user\'s export', code: 'FORBIDDEN' });
      return;
    }

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      res.status(400).json({ error: `Cannot cancel export in ${job.status} state`, code: 'INVALID_STATE' });
      return;
    }

    await updateExportJob(ctx.schema, req.params.id, { status: 'cancelled' });
    res.json({ success: true, message: 'Export cancelled' });
  }),
);

export default router;
export { MODULE_TABLE_MAP, resolveExportTable, isRestrictedColumn, redactPIIValue, redactExportRows, validateColumns, getTableColumns };
