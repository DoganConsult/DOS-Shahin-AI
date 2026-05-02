import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';

export interface WorkflowAttachment {
  attachment_id: string;
  instance_id: string;
  step_id: string | null;
  file_id: string | null;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  purpose: string | null;
  created_at: string;
}

export interface AttachInput {
  instanceId: string;
  stepId?: string;
  fileId?: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy: string;
  purpose?: string;
}

export async function addAttachment(
  tenantId: string,
  input: AttachInput,
): Promise<WorkflowAttachment> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_attachments
       (instance_id, step_id, file_id, file_name, uploaded_by, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.instanceId,
      input.stepId || null,
      input.fileId || null,
      input.fileName,
      input.uploadedBy,
      input.uploadedBy,
    ],
  );
  const row = getFirstRow(result)!;

  await recordAudit({
    tenantId,
    userId: input.uploadedBy,
    module: 'workflow',
    action: 'create',
    entityType: 'workflow_attachment',
    entityId: row.attachment_id,
    afterState: { instanceId: input.instanceId, fileName: input.fileName },
  });

  return mapRow(row);
}

export async function getAttachmentsByInstance(
  tenantId: string,
  instanceId: string,
  stepId?: string,
): Promise<WorkflowAttachment[]> {
  const schema = tenantSchema(tenantId);
  const where = ['wa.instance_id = $1', 'wa.deleted_at IS NULL'];
  const params: unknown[] = [instanceId];

  if (stepId) {
    where.push('wa.step_id = $2');
    params.push(stepId);
  }

  const result = await safeQuery(
    `SELECT wa.*, fs.file_size, fs.mime_type
     FROM "${schema}".workflow_attachments wa
     LEFT JOIN "${schema}".file_storage fs ON fs.file_id = wa.file_id
     WHERE ${where.join(' AND ')}
     ORDER BY wa.created_at DESC`,
    params,
  );
  return result.rows.map(mapRow);
}

export async function removeAttachment(
  tenantId: string,
  attachmentId: string,
  userId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".workflow_attachments
     SET deleted_at = NOW(), updated_by = $1
     WHERE attachment_id = $2 AND deleted_at IS NULL`,
    [userId, attachmentId],
  );
  if ((result.rowCount ?? 0) === 0) return false;

  await recordAudit({
    tenantId,
    userId,
    module: 'workflow',
    action: 'delete',
    entityType: 'workflow_attachment',
    entityId: attachmentId,
  });

  return true;
}

function mapRow(row: Record<string, unknown>): WorkflowAttachment {
  return {

    attachment_id: row.attachment_id,

    instance_id: row.instance_id,

    step_id: row.step_id || null,

    file_id: row.file_id || null,

    file_name: row.file_name,
    file_size: row.file_size ? Number(row.file_size) : null,

    mime_type: row.mime_type || null,

    uploaded_by: row.uploaded_by || row.created_by,

    purpose: row.purpose || null,

    created_at: row.created_at,
  };
}
