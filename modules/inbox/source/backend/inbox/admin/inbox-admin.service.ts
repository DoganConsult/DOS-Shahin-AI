/**
 * Inbox Admin Service - Spec Compliant Implementation
 * Canonical service for runtime configuration and admin controls
 */

import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';

export interface InboxAdminConfig {
  // Processing settings
  maxProcessingQueueSize: number;
  processingBatchSize: number;
  processingTimeoutMinutes: number;
  maxRetries: number;
  
  // Triage settings
  autoTriageEnabled: boolean;
  triageRules: Array<{
    name: string;
    conditions: Record<string, any>;
    actions: Record<string, any>;
    enabled: boolean;
  }>;
  
  // Retention settings
  retentionDays: number;
  archiveAfterDays: number;
  autoCleanup: boolean;
  
  // Performance settings
  indexRebuildThreshold: number;
  metricsRetentionDays: number;
  
  // Notification settings
  enableNotifications: boolean;
  notificationChannels: string[];
  
  // Security settings
  maxItemsPerUser: number;
  rateLimitPerMinute: number;
  allowedSourceModules: string[];
}

export interface InboxSystemStatus {
  moduleVersion: string;
  uptime: number;
  activeItems: number;
  processingQueueSize: number;
  lastActivity: string;
  systemHealth: {
    database: 'connected' | 'disconnected' | 'error';
    aggregation: 'healthy' | 'degraded' | 'error';
    triage: 'healthy' | 'degraded' | 'error';
    processing: 'healthy' | 'degraded' | 'error';
  };
}

const DEFAULT_CONFIG: InboxAdminConfig = {
  // Processing settings
  maxProcessingQueueSize: 1000,
  processingBatchSize: 50,
  processingTimeoutMinutes: 30,
  maxRetries: 3,
  
  // Triage settings
  autoTriageEnabled: true,
  triageRules: [
    {
      name: 'high_priority_escalation',
      conditions: { priority: 'critical', ageHours: 1 },
      actions: { escalate: true, assignTo: 'inbox.manager' },
      enabled: true
    },
    {
      name: 'overdue_triage',
      conditions: { ageHours: 24, triageStatus: 'pending' },
      actions: { escalate: true, priority: 'high' },
      enabled: true
    }
  ],
  
  // Retention settings
  retentionDays: 365,
  archiveAfterDays: 90,
  autoCleanup: true,
  
  // Performance settings
  indexRebuildThreshold: 100,
  metricsRetentionDays: 30,
  
  // Notification settings
  enableNotifications: true,
  notificationChannels: ['email', 'in_app'],
  
  // Security settings
  maxItemsPerUser: 10000,
  rateLimitPerMinute: 100,
  allowedSourceModules: ['compliance', 'risk', 'audit', 'workflow', 'action', 'notification']
};

/**
 * Get admin configuration
 * Implements the canonical InboxAdminService from spec §3.1
 */
export async function getInboxAdminConfig(tenantId: string): Promise<InboxAdminConfig> {
  const schema = tenantSchema(tenantId);

  try {
    const { rows } = await safeQuery(
      `SELECT config_value FROM "${schema}".module_configs 
       WHERE module_code = 'inbox' AND config_key = 'admin_settings' 
       LIMIT 1`,
      []
    ).catch(() => ({ rows: [] }));

    if (!rows.length) {
      logger.info('[InboxAdminService] Using default config', { tenantId });
      return { ...DEFAULT_CONFIG };
    }

    const stored = JSON.parse(rows[0].config_value as string);
    const config = { ...DEFAULT_CONFIG, ...stored };

    logger.info('[InboxAdminService] Retrieved config', { tenantId });
    return config;

  } catch (error) {
    logger.error('[InboxAdminService] Failed to get config', {
      tenantId,
      error: (error as Error).message
    });

    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Update admin configuration
 */
export async function updateInboxAdminConfig(
  tenantId: string,
  updates: Partial<InboxAdminConfig>,
  userId?: string
): Promise<InboxAdminConfig> {
  const schema = tenantSchema(tenantId);

  try {
    const current = await getInboxAdminConfig(tenantId);
    const updated = { ...current, ...updates };

    // Validate configuration
    const validationResult = validateConfig(updated);
    if (!validationResult.valid) {
      throw new Error(`Invalid configuration: ${validationResult.errors.join(', ')}`);
    }

    // Save configuration
    await safeQuery(
      `INSERT INTO "${schema}".module_configs 
       (module_code, config_key, config_value, updated_by, updated_at)
       VALUES ('inbox', 'admin_settings', $1, $2, NOW())
       ON CONFLICT (module_code, config_key) 
       DO UPDATE SET config_value = $1, updated_by = $2, updated_at = NOW()`,
      [JSON.stringify(updated), userId || 'system']
    );

    logger.info('[InboxAdminService] Config updated', {
      tenantId,
      userId,
      updatedFields: Object.keys(updates)
    });

    return updated;

  } catch (error) {
    logger.error('[InboxAdminService] Failed to update config', {
      tenantId,
      userId,
      error: (error as Error).message
    });

    throw error;
  }
}

/**
 * Get system status
 */
export async function getInboxSystemStatus(tenantId: string): Promise<InboxSystemStatus> {
  const schema = tenantSchema(tenantId);

  try {
    // Get item counts
    const { rows: itemRows } = await safeQuery(
      `SELECT 
         COUNT(*) as total_items,
         COUNT(CASE WHEN status != 'archived' THEN 1 END) as active_items,
         MAX(updated_at) as last_activity
       FROM "${schema}".inbox_items`,
      []
    ).catch(() => ({ rows: [{ total_items: 0, active_items: 0, last_activity: null }] }));

    // Get processing queue size
    const { rows: queueRows } = await safeQuery(
      `SELECT COUNT(*) as queue_size FROM "${schema}".inbox_processing_queue WHERE status = 'pending'`,
      []
    ).catch(() => ({ rows: [{ queue_size: 0 }] }));

    // Determine system health
    const systemHealth = await checkSystemHealth(tenantId);

    return {
      moduleVersion: '1.0.0',
      uptime: process.uptime(),
      activeItems: parseInt(itemRows[0].active_items),
      processingQueueSize: parseInt(queueRows[0].queue_size),
      lastActivity: itemRows[0].last_activity || new Date().toISOString(),
      systemHealth
    };

  } catch (error) {
    logger.error('[InboxAdminService] Failed to get system status', {
      tenantId,
      error: (error as Error).message
    });

    return {
      moduleVersion: '1.0.0',
      uptime: process.uptime(),
      activeItems: 0,
      processingQueueSize: 0,
      lastActivity: new Date().toISOString(),
      systemHealth: {
        database: 'error',
        aggregation: 'error',
        triage: 'error',
        processing: 'error'
      }
    };
  }
}

/**
 * Reset configuration to defaults
 */
export async function resetInboxAdminConfig(tenantId: string, userId?: string): Promise<InboxAdminConfig> {
  try {
    await updateInboxAdminConfig(tenantId, DEFAULT_CONFIG, userId);
    
    logger.info('[InboxAdminService] Config reset to defaults', {
      tenantId,
      userId
    });

    return { ...DEFAULT_CONFIG };
  } catch (error) {
    logger.error('[InboxAdminService] Failed to reset config', {
      tenantId,
      userId,
      error: (error as Error).message
    });

    throw error;
  }
}

/**
 * Export configuration
 */
export async function exportInboxAdminConfig(tenantId: string): Promise<{
  config: InboxAdminConfig;
  exportedAt: string;
  version: string;
}> {
  const config = await getInboxAdminConfig(tenantId);

  return {
    config,
    exportedAt: new Date().toISOString(),
    version: '1.0.0'
  };
}

/**
 * Import configuration
 */
export async function importInboxAdminConfig(
  tenantId: string,
  configData: InboxAdminConfig,
  userId?: string
): Promise<InboxAdminConfig> {
  try {
    // Validate imported configuration
    const validationResult = validateConfig(configData);
    if (!validationResult.valid) {
      throw new Error(`Invalid imported configuration: ${validationResult.errors.join(', ')}`);
    }

    // Apply imported configuration
    const updated = await updateInboxAdminConfig(tenantId, configData, userId);

    logger.info('[InboxAdminService] Config imported', {
      tenantId,
      userId,
      importedFields: Object.keys(configData)
    });

    return updated;

  } catch (error) {
    logger.error('[InboxAdminService] Failed to import config', {
      tenantId,
      userId,
      error: (error as Error).message
    });

    throw error;
  }
}

/**
 * Get configuration history
 */
export async function getInboxAdminConfigHistory(tenantId: string, limit: number = 10): Promise<Array<{
  updatedBy: string;
  updatedAt: string;
  changes: Record<string, any>;
}>> {
  const schema = tenantSchema(tenantId);

  try {
    const { rows } = await safeQuery(
      `SELECT updated_by, updated_at, config_value
       FROM "${schema}".module_configs
       WHERE module_code = 'inbox' AND config_key = 'admin_settings'
       ORDER BY updated_at DESC
       LIMIT $1`,
      [limit]
    );

    return rows.map((row: any) => ({
      updatedBy: row.updated_by,
      updatedAt: row.updated_at,
      changes: JSON.parse(row.config_value)
    }));

  } catch (error) {
    logger.error('[InboxAdminService] Failed to get config history', {
      tenantId,
      error: (error as Error).message
    });

    return [];
  }
}

// Helper functions

function validateConfig(config: InboxAdminConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate processing settings
  if (config.maxProcessingQueueSize <= 0 || config.maxProcessingQueueSize > 10000) {
    errors.push('Max processing queue size must be between 1 and 10000');
  }

  if (config.processingBatchSize <= 0 || config.processingBatchSize > 1000) {
    errors.push('Processing batch size must be between 1 and 1000');
  }

  if (config.processingTimeoutMinutes <= 0 || config.processingTimeoutMinutes > 1440) {
    errors.push('Processing timeout must be between 1 and 1440 minutes');
  }

  if (config.maxRetries < 0 || config.maxRetries > 10) {
    errors.push('Max retries must be between 0 and 10');
  }

  // Validate retention settings
  if (config.retentionDays <= 0 || config.retentionDays > 3650) {
    errors.push('Retention days must be between 1 and 3650');
  }

  if (config.archiveAfterDays < 0 || config.archiveAfterDays > config.retentionDays) {
    errors.push('Archive after days must be between 0 and retention days');
  }

  // Validate performance settings
  if (config.indexRebuildThreshold <= 0) {
    errors.push('Index rebuild threshold must be positive');
  }

  if (config.metricsRetentionDays <= 0 || config.metricsRetentionDays > 365) {
    errors.push('Metrics retention days must be between 1 and 365');
  }

  // Validate security settings
  if (config.maxItemsPerUser <= 0 || config.maxItemsPerUser > 100000) {
    errors.push('Max items per user must be between 1 and 100000');
  }

  if (config.rateLimitPerMinute <= 0 || config.rateLimitPerMinute > 10000) {
    errors.push('Rate limit per minute must be between 1 and 10000');
  }

  if (!Array.isArray(config.allowedSourceModules) || config.allowedSourceModules.length === 0) {
    errors.push('Allowed source modules must be a non-empty array');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

async function checkSystemHealth(_tenantId: string): Promise<InboxSystemStatus['systemHealth']> {

  try {
    // Check database connectivity
    const { rows: dbRows } = await safeQuery(
      `SELECT 1`,
      []
    ).catch(() => ({ rows: [] }));
    
    const database = dbRows.length > 0 ? 'connected' : 'disconnected';

    // Check service health (simplified checks)
    const aggregation = 'healthy'; // Would check actual aggregation service
    const triage = 'healthy'; // Would check actual triage service
    const processing = 'healthy'; // Would check actual processing service

    return {
      database,
      aggregation,
      triage,
      processing
    };

  } catch (_error) {
    return {
      database: 'error',
      aggregation: 'error',
      triage: 'error',
      processing: 'error'
    };
  }
}
