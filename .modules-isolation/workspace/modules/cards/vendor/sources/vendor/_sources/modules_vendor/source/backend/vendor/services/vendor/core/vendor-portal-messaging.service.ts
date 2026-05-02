import { logger } from '../../../ports/logger.port';
// ============================================
// Vendor Portal Messaging
// Create, list, and manage messages between
// vendor portal users and GRC team members.
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { createNotification } from '../../../../notification/services/notification.service.js';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';

/**
 * Create a message between vendor portal user and GRC team.
 * Messages are stored in vendor_portal_messages and linked to a vendor.
 */
export async function createVendorMessage(
  tenantId: string,
  vendorId: string,
  senderId: string,
  senderType: 'vendor' | 'grc_team',
  subject: string,
  body: string,
  parentMessageId?: string,
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".vendor_portal_messages (
      message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      vendor_id UUID NOT NULL,
      sender_id UUID NOT NULL,
      sender_type VARCHAR(20) NOT NULL DEFAULT 'grc_team',
      subject VARCHAR(500) NOT NULL,
      body TEXT NOT NULL,
      parent_message_id UUID,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const result = await safeQuery(
    `INSERT INTO "${schema}".vendor_portal_messages
       (vendor_id, sender_id, sender_type, subject, body, parent_message_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [vendorId, senderId, senderType, subject, body, parentMessageId ?? null],
  );

  const message = getFirstRow(result)!;

  // Notify the recipient side
  if (senderType === 'vendor') {
    // Notify the GRC vendor owner
    const ownerRes = await safeQuery(
      `SELECT owner_id FROM "${schema}".vendors WHERE vendor_id = $1 LIMIT 1`,
      [vendorId],
    );
    const ownerId = getFirstRow(ownerRes)?.owner_id;
    if (ownerId) {
      await createNotification(tenantId, {
        userId: ownerId,
        type: 'vendor_message',
        title: `New message from vendor: ${subject}`,
        body: body.substring(0, 200),
        link: `/vendors/${vendorId}/messages`,
      }).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));
    }
  }

  await eventBus.publish(({
      eventType: 'vendor.monitoring_signal',
      tenantId,
      sourceService: 'vendor-enhancements',
      severity: 'info',
      entityType: 'vendor_message',
      entityId: message?.message_id,
      payload: { vendorId, senderId, senderType, subject, messageId: message?.message_id },
    } as any)).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));

  return message;
}

/**
 * List messages for a vendor, optionally filtered by sender type.
 */
export async function listVendorMessages(
  tenantId: string,
  vendorId: string,
  opts?: { senderType?: string; unreadOnly?: boolean; limit?: number },
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions = ['vendor_id = $1'];
  const params: unknown[] = [vendorId];
  let idx = 2;

  if (opts?.senderType) {
    conditions.push(`sender_type = $${idx++}`);
    params.push(opts.senderType);
  }
  if (opts?.unreadOnly) {
    conditions.push('read_at IS NULL');
  }

  const limit = Math.min(Math.max(1, parseInt(String(opts?.limit ?? 50), 10) || 50), 500);
  params.push(limit);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".vendor_portal_messages
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${idx}`,
    params,
  );
  return result.rows;
}

/**
 * Mark a vendor message as read.
 */
export async function markVendorMessageRead(
  tenantId: string,
  messageId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".vendor_portal_messages
     SET read_at = NOW()
     WHERE message_id = $1 AND read_at IS NULL`,
    [messageId],
  );
}
