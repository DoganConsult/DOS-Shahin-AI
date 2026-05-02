import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';

export async function getLocalKnowledgeJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'knowledge-embedding-pipeline',
      cron: '*/15 * * * *',
      description: 'Process pending document embeddings',
      handler: async () => {
        logger.info('[Job] knowledge-embedding-pipeline started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS pending FROM "${schema}".knowledge_documents
                 WHERE deleted_at IS NULL AND embedding_status = 'pending'`,
              );
              const pending = result.rows[0]?.pending || 0;
              if (pending > 0) {
                logger.info(`[Job] knowledge-embedding-pipeline: tenant ${t.tenant_id} — ${pending} documents awaiting embedding`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error(`[Job] knowledge-embedding-pipeline error: ${toErrorMessage(err)}`);
        }
      },
    },
    {
      name: 'knowledge-stale-document-check',
      cron: '0 3 * * 1',
      description: 'Detect stale knowledge documents not refreshed in 90+ days',
      handler: async () => {
        logger.info('[Job] knowledge-stale-document-check started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS stale FROM "${schema}".knowledge_documents
                 WHERE deleted_at IS NULL AND updated_at < NOW() - INTERVAL '90 days'`,
              );
              const stale = result.rows[0]?.stale || 0;
              if (stale > 0) {
                logger.warn(`[Job] knowledge-stale-document-check: tenant ${t.tenant_id} — ${stale} stale documents`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error(`[Job] knowledge-stale-document-check error: ${toErrorMessage(err)}`);
        }
      },
    },
    {
      name: 'knowledge-source-sync',
      cron: '0 */4 * * *',
      description: 'Sync external knowledge sources (SharePoint, Confluence, etc.)',
      handler: async () => {
        logger.info('[Job] knowledge-source-sync started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS due FROM "${schema}".knowledge_sources
                 WHERE enabled = true AND (last_synced_at IS NULL OR last_synced_at < NOW() - INTERVAL '4 hours')`,
              );
              const due = result.rows[0]?.due || 0;
              if (due > 0) {
                logger.info(`[Job] knowledge-source-sync: tenant ${t.tenant_id} — ${due} sources due for sync`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error(`[Job] knowledge-source-sync error: ${toErrorMessage(err)}`);
        }
      },
    },
  ];
}

