/**
 * Inbox Aggregation Service - Spec Compliant Implementation
 * Canonical service for inbox item aggregation from approved sources
 */

import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';
import { SYSTEM_JOB_ACTOR as _SYSTEM_JOB_ACTOR } from '../ports/platform.port';
import { v4 as uuid } from 'uuid';

export interface InboxItemSource {
  sourceId: string;
  sourceType: 'notification' | 'task' | 'approval' | 'message' | 'workflow' | 'action';
  sourceModule: string;
  sourceEntityId: string;
  sourceTitle: string;
  sourceDescription?: string;
  sourcePriority: 'low' | 'medium' | 'high' | 'critical';
  sourceMetadata?: Record<string, unknown>;
}

export interface InboxItem {
  itemId: string;
  tenantId: string;
  userId: string;
  sourceId: string;
  sourceType: InboxItemSource['sourceType'];
  sourceModule: string;
  sourceEntityId: string;
  title: string;
  description?: string;
  priority: InboxItemSource['sourcePriority'];
  status: 'unread' | 'read' | 'archived' | 'flagged' | 'action_required';
  triageStatus?: 'pending' | 'in_review' | 'triaged' | 'escalated';
  assignedTo?: string;
  dueDate?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  readAt?: string;
  archivedAt?: string;
}

export interface AggregationRequest {
  tenantId: string;
  userId?: string;
  sourceTypes?: InboxItemSource['sourceType'][];
  status?: InboxItem['status'][];
  priority?: InboxItemSource['sourcePriority'][];
  limit?: number;
  offset?: number;
}

export interface AggregationResult {
  items: InboxItem[];
  totalCount: number;
  hasMore: boolean;
  aggregatedAt: string;
}

/**
 * Main entry point for inbox aggregation
 * Implements the canonical InboxAggregationService from spec §3.1
 */
export async function aggregateInboxItems(
  request: AggregationRequest
): Promise<AggregationResult> {
  const schema = tenantSchema(request.tenantId);
  const startTime = Date.now();

  try {
    // Build aggregation query
    let query = `
      SELECT 
        item_id,
        tenant_id,
        user_id,
        source_id,
        source_type,
        source_module,
        source_entity_id,
        title,
        description,
        priority,
        status,
        triage_status,
        assigned_to,
        due_date,
        metadata,
        created_at,
        updated_at,
        read_at,
        archived_at
      FROM "${schema}".inbox_items
      WHERE tenant_id = $1
    `;

    const params: any[] = [request.tenantId];
    let paramIndex = 2;

    // Add filters
    if (request.userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(request.userId);
    }

    if (request.sourceTypes && request.sourceTypes.length > 0) {
      query += ` AND source_type = ANY($${paramIndex++})`;
      params.push(request.sourceTypes);
    }

    if (request.status && request.status.length > 0) {
      query += ` AND status = ANY($${paramIndex++})`;
      params.push(request.status);
    }

    if (request.priority && request.priority.length > 0) {
      query += ` AND priority = ANY($${paramIndex++})`;
      params.push(request.priority);
    }

    // Add ordering
    query += ` ORDER BY 
      CASE priority 
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      created_at DESC`;

    // Add pagination
    const limit = Math.min(request.limit || 50, 100);
    const offset = request.offset || 0;

    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    // Execute aggregation query
    const { rows } = await safeQuery(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total_count
      FROM "${schema}".inbox_items
      WHERE tenant_id = $1
    `;

    const countParams: any[] = [request.tenantId];
    let countParamIndex = 2;

    if (request.userId) {
      countQuery += ` AND user_id = $${countParamIndex++}`;
      countParams.push(request.userId);
    }

    if (request.sourceTypes && request.sourceTypes.length > 0) {
      countQuery += ` AND source_type = ANY($${countParamIndex++})`;
      countParams.push(request.sourceTypes);
    }

    if (request.status && request.status.length > 0) {
      countQuery += ` AND status = ANY($${countParamIndex++})`;
      countParams.push(request.status);
    }

    if (request.priority && request.priority.length > 0) {
      countQuery += ` AND priority = ANY($${countParamIndex++})`;
      countParams.push(request.priority);
    }

    const { rows: countRows } = await safeQuery(countQuery, countParams);
    const totalCount = parseInt(countRows[0].total_count);

    // Map to InboxItem interface
    const items: InboxItem[] = rows.map(row => ({
      itemId: row.item_id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      sourceId: row.source_id,
      sourceType: row.source_type,
      sourceModule: row.source_module,
      sourceEntityId: row.source_entity_id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      triageStatus: row.triage_status,
      assignedTo: row.assigned_to,
      dueDate: row.due_date,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      readAt: row.read_at,
      archivedAt: row.archived_at
    }));

    const aggregationTime = Date.now() - startTime;

    logger.info('[InboxAggregationService] Aggregation completed', {
      tenantId: request.tenantId,
      userId: request.userId,
      itemCount: items.length,
      totalCount,
      aggregationTime
    });

    return {
      items,
      totalCount,
      hasMore: offset + items.length < totalCount,
      aggregatedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error('[InboxAggregationService] Aggregation failed', {
      tenantId: request.tenantId,
      error: (error as Error).message
    });

    throw error;
  }
}

/**
 * Add items to inbox from external sources
 */
export async function addInboxItems(
  tenantId: string,
  items: InboxItemSource[]
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  const itemIds: string[] = [];

  try {
    for (const source of items) {
      const itemId = uuid();

      // Determine users who should receive this item
      // For now, assign to all active users (this should be refined based on business rules)
      const { rows: userRows } = await safeQuery(
        `SELECT user_id FROM "${schema}".user_profiles WHERE status = 'active'`,
        []
      );

      for (const userRow of userRows) {
        await safeQuery(
          `INSERT INTO "${schema}".inbox_items
             (item_id, tenant_id, user_id, source_id, source_type, source_module,
              source_entity_id, title, description, priority, status, metadata,
              created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'unread', $11, NOW(), NOW())`,
          [
            itemId,
            tenantId,
            userRow.user_id,
            source.sourceId,
            source.sourceType,
            source.sourceModule,
            source.sourceEntityId,
            source.sourceTitle,
            source.sourceDescription,
            source.sourcePriority,
            JSON.stringify(source.sourceMetadata || {})
          ]
        );
      }

      itemIds.push(itemId);
    }

    logger.info('[InboxAggregationService] Items added to inbox', {
      tenantId,
      itemCount: items.length,
      itemIds
    });

    return itemIds;

  } catch (error) {
    logger.error('[InboxAggregationService] Failed to add items', {
      tenantId,
      itemCount: items.length,
      error: (error as Error).message
    });

    throw error;
  }
}

/**
 * Get inbox statistics
 */
export async function getInboxStatistics(
  tenantId: string,
  userId?: string
): Promise<{
  totalItems: number;
  unreadItems: number;
  readItems: number;
  archivedItems: number;
  flaggedItems: number;
  actionRequiredItems: number;
  bySourceType: Record<string, number>;
  byPriority: Record<string, number>;
}> {
  const schema = tenantSchema(tenantId);

  try {
    let query = `
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN status = 'unread' THEN 1 END) as unread_items,
        COUNT(CASE WHEN status = 'read' THEN 1 END) as read_items,
        COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_items,
        COUNT(CASE WHEN status = 'flagged' THEN 1 END) as flagged_items,
        COUNT(CASE WHEN status = 'action_required' THEN 1 END) as action_required_items
      FROM "${schema}".inbox_items
      WHERE tenant_id = $1
    `;

    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (userId) {
      query += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }

    const { rows: statRows } = await safeQuery(query, params);
    const stats = statRows[0];

    // Get breakdown by source type
    let sourceTypeQuery = `
      SELECT source_type, COUNT(*) as count
      FROM "${schema}".inbox_items
      WHERE tenant_id = $1
    `;

    const sourceTypeParams: any[] = [tenantId];
    let sourceTypeParamIndex = 2;

    if (userId) {
      sourceTypeQuery += ` AND user_id = $${sourceTypeParamIndex++}`;
      sourceTypeParams.push(userId);
    }

    sourceTypeQuery += ` GROUP BY source_type`;

    const { rows: sourceTypeRows } = await safeQuery(sourceTypeQuery, sourceTypeParams);
    const bySourceType = sourceTypeRows.reduce((acc, row) => {
      acc[row.source_type] = parseInt(row.count);
      return acc;
    }, {} as Record<string, number>);

    // Get breakdown by priority
    let priorityQuery = `
      SELECT priority, COUNT(*) as count
      FROM "${schema}".inbox_items
      WHERE tenant_id = $1
    `;

    const priorityParams: any[] = [tenantId];
    let priorityParamIndex = 2;

    if (userId) {
      priorityQuery += ` AND user_id = $${priorityParamIndex++}`;
      priorityParams.push(userId);
    }

    priorityQuery += ` GROUP BY priority`;

    const { rows: priorityRows } = await safeQuery(priorityQuery, priorityParams);
    const byPriority = priorityRows.reduce((acc, row) => {
      acc[row.priority] = parseInt(row.count);
      return acc;
    }, {} as Record<string, number>);

    return {
      totalItems: parseInt(stats.total_items),
      unreadItems: parseInt(stats.unread_items),
      readItems: parseInt(stats.read_items),
      archivedItems: parseInt(stats.archived_items),
      flaggedItems: parseInt(stats.flagged_items),
      actionRequiredItems: parseInt(stats.action_required_items),
      bySourceType,
      byPriority
    };

  } catch (error) {
    logger.error('[InboxAggregationService] Failed to get statistics', {
      tenantId,
      userId,
      error: (error as Error).message
    });

    throw error;
  }
}
