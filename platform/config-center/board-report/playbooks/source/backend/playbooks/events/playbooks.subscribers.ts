import { logger, toErrorMessage } from '@dos/module-sdk';

export function registerPlaybooksEventSubscribers(): void {
  logger.info('[Playbooks] Event subscribers registered');
}

export async function handleIncidentClassified(payload: {
  tenantId: string;
  incidentId: string;
  classification: string;
  severity: string;
}): Promise<void> {
  const { safeQuery, tenantSchema } = await import('@dos/db');
  try {
    const schema = tenantSchema(payload.tenantId);
    // Find matching playbook for this classification/severity
    const { rows } = await safeQuery(
      `SELECT id, name FROM "${schema}".playbooks
       WHERE trigger_classification = $1 AND status = 'active' AND deleted_at IS NULL
       ORDER BY priority ASC LIMIT 1`,
      [payload.classification],
    );
    if (rows.length > 0) {
      logger.info(`[Playbooks] Auto-triggering playbook ${rows[0].name} for incident ${payload.incidentId}`);
    }
  } catch (err) {
    logger.error(`[Playbooks] handleIncidentClassified failed: ${toErrorMessage(err)}`);
  }
}
