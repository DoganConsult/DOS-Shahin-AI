import { catchHandler, EC } from '@dos/platform-core/resilience';
/**
 * Report Sharing Service
 *
 * Manages report sharing between users within a tenant.
 * Prevents cross-tenant sharing and sends notifications.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.5, 13.6
 */

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { getProductUrl } from '../../ports/platform.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ===========================================================================
// Types
// ===========================================================================

export interface ShareRecord {
  shareId: string;
  reportId: string;
  sharedBy: string;
  recipientId: string;
  recipientType: 'user' | 'team';
  sharedAt: string;
}

export interface ShareRequest {
  reportId: string;
  sharedBy: string;
  recipientIds: string[];
  recipientType: 'user' | 'team';
}

// ===========================================================================
// Pure Functions
// ===========================================================================

/**
 * Validate a share request. Rejects cross-tenant recipients.
 * Returns validation result with error messages.
 *
 * Requirement 13.6: Prevent cross-tenant sharing.
 */
export function validateShareRequest(
  request: ShareRequest,
  tenantUserIds: string[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.reportId) {
    errors.push('reportId is required');
  }
  if (!request.sharedBy) {
    errors.push('sharedBy is required');
  }
  if (!request.recipientIds || request.recipientIds.length === 0) {
    errors.push('At least one recipient is required');
  }

  // Check that all recipients belong to the same tenant
  if (request.recipientType === 'user' && tenantUserIds.length > 0) {
    for (const rid of request.recipientIds) {
      if (!tenantUserIds.includes(rid)) {
        errors.push(`Recipient ${rid} does not belong to this tenant`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ===========================================================================
// DB Functions
// ===========================================================================

/**
 * Share a report with one or more recipients.
 * Creates share records and sends notifications.
 *
 * Requirement 13.1: Share reports with users/teams.
 * Requirement 13.5: Record sharing metadata.
 */
export async function shareReport(
  tenantId: string,
  request: ShareRequest,
): Promise<ShareRecord[]> {
  const schema = tenantSchema(tenantId);
  const shares: ShareRecord[] = [];

  for (const recipientId of request.recipientIds) {
    const result = await safeQuery(
      `INSERT INTO "${schema}".report_shares
         (report_id, shared_by, recipient_id, recipient_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (report_id, recipient_id) DO UPDATE SET
         shared_by = EXCLUDED.shared_by, recipient_type = EXCLUDED.recipient_type
       WHERE (report_shares.shared_by, report_shares.recipient_type) IS DISTINCT FROM (EXCLUDED.shared_by, EXCLUDED.recipient_type)
       RETURNING share_id, report_id, shared_by, recipient_id, recipient_type, shared_at`,
      [request.reportId, request.sharedBy, recipientId, request.recipientType],
    );

    if (result.rows.length > 0) {
      const row = getFirstRow(result)!;
      shares.push({
        shareId: row.share_id,
        reportId: row.report_id,
        sharedBy: row.shared_by,
        recipientId: row.recipient_id,
        recipientType: row.recipient_type,
        sharedAt: row.shared_at instanceof Date ? row.shared_at.toISOString() : row.shared_at,
      });
    }
  }

  // Send notifications + email (best-effort)
  try {
    const { createNotification } = await import('../../../notification/services/notification.service.js');
    const { sendTemplatedEmail } = await import('@dos/platform-core/notifications');

    // Fetch report title once
    let reportTitle = 'A report';
    try {
      const reportResult = await safeQuery(
        `SELECT title FROM "${schema}".reports WHERE report_id = $1`,
        [request.reportId]
      );
      if (reportResult.rows.length > 0) reportTitle = getFirstRow(reportResult)?.title;
    } catch { /* title lookup failure is non-fatal */ }

    for (const share of shares) {
      // In-app notification
      await createNotification(tenantId, {
        userId: share.recipientId,
        type: 'report_shared',
        title: 'Report shared with you',
        body: `"${reportTitle}" has been shared with you.`,
        link: `/report-hub/${share.reportId}`,
      }).catch(catchHandler(EC.EVENT_BUS, {}));

      // Email notification
      try {
        const recipientResult = await safeQuery(
          `SELECT email, full_name FROM users WHERE user_id = $1 AND tenant_id = $2`,
          [share.recipientId, tenantId]
        );
        if (recipientResult.rows.length > 0) {
          const r = getFirstRow(recipientResult)!;
          await sendTemplatedEmail(r.email, 'report_ready', {
            recipientName: r.full_name,
            title: `Report shared with you: ${reportTitle}`,
            body: `"${reportTitle}" has been shared with you. Click below to view it.`,
            ctaLabel: 'View Report',
            ctaUrl: `${getProductUrl()}/report-hub/${share.reportId}`,
          }).catch(catchHandler(EC.EVENT_BUS, {}));
        }
      } catch { /* email failure is non-fatal */ }
    }
  } catch {
    // Notification failure should not block sharing
  }

  return shares;
}

/**
 * Get all shares for a specific report.
 *
 * Requirement 13.2: List shares for a report.
 */
export async function getSharesForReport(
  tenantId: string,
  reportId: string,
): Promise<ShareRecord[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT share_id, report_id, shared_by, recipient_id, recipient_type, shared_at
     FROM "${schema}".report_shares
     WHERE report_id = $1
     ORDER BY shared_at DESC`,
    [reportId],
  );

  return result.rows.map((row: GenericRow) => ({
    shareId: row.share_id,
    reportId: row.report_id,
    sharedBy: row.shared_by,
    recipientId: row.recipient_id,
    recipientType: row.recipient_type,
    sharedAt: row.shared_at instanceof Date ? row.shared_at.toISOString() : row.shared_at,
  }));
}

/**
 * Get report IDs shared with a specific user.
 *
 * Requirement 13.3: Shared reports appear in catalog.
 */
export async function getReportsSharedWithUser(
  tenantId: string,
  userId: string,
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT DISTINCT report_id
     FROM "${schema}".report_shares
     WHERE recipient_id = $1`,
    [userId],
  );
  return result.rows.map((row: GenericRow) => row.report_id);
}

/**
 * Revoke a share record.
 */
export async function revokeShare(
  tenantId: string,
  shareId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `DELETE FROM "${schema}".report_shares WHERE share_id = $1`,
    [shareId],
  );
}
