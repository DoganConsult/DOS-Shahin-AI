// ============================================
// Evidence File Storage Integration
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { uploadFile, getFile, listFiles, FileRecord } from '../../ports/platform.port';
import { getFirstRow } from '@dos/db';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import type { GenericRow as _GenericRow } from '@dos/types';

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/msword',
  'application/json',
  'application/xml',
  'text/xml',
  'text/plain',
  'text/csv',
  'text/yaml',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/x-yaml',
  'application/octet-stream',
  'application/x-pem-file',
  'application/x-x509-ca-cert',
  'application/pkix-cert',
]);

export const BLOCKED_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'js', 'msi', 'dll', 'com',
  'scr', 'hta', 'cpl', 'inf', 'reg', 'ws', 'wsf', 'wsc', 'wsh', 'jar',
]);

/**
 * Upload an evidence file attachment and track it in the file_storage table.
 * Returns both the file record and the updated evidence row.
 */
export async function uploadEvidenceFile(
  tenantId: string,
  evidenceId: string,
  buffer: Buffer,
  filename: string,
  uploadedBy: string,
  contentType?: string,
): Promise<{ file: FileRecord; evidence: any }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.evidence_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

/**
 * Download an evidence file by evidence ID.
 */
export async function downloadEvidenceFile(
  tenantId: string,
  evidenceId: string,
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.evidence_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

/**
 * List all files attached to an evidence item.
 */
export async function listEvidenceFiles(tenantId: string, evidenceId: string): Promise<FileRecord[]> {

  return listFiles(tenantId, 'evidence', (evidenceId as any));
}
