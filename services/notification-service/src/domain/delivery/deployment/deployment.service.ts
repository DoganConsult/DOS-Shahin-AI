import { safeQuery, tenantSchema, withTenantClient } from '@dos/db';
import { publishEvent as _pe } from '@dos/module-sdk';
const publish = (eventType: string, _module: string, payload: any, _meta?: any) => _pe({ eventType, payload } as any);
import { v4 as uuid } from 'uuid';
import type { DeploymentRecord, DeploymentStatus } from '../contracts/delivery.types';

export async function startDeployment(input: {
  releaseId: string;
  tenantId: string;
  environment: string;
  deployedBy: string;
}): Promise<DeploymentRecord> {
  const deploymentId = uuid();
  const now = new Date().toISOString();
  const schema = tenantSchema(input.tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".dos_deployments (
      deployment_id, release_id, tenant_id, environment, status,
      deployed_by, started_at, completed_at, failed_at, failure_reason, rollback_id
    ) VALUES ($1,$2,$3,$4,'in_progress',$5,$6,NULL,NULL,NULL,NULL)`,
    [deploymentId, input.releaseId, input.tenantId, input.environment, input.deployedBy, now],
  );
  await publish('delivery.deployment.started', input.tenantId, { deploymentId, releaseId: input.releaseId, environment: input.environment }, {});
  return getDeployment(input.tenantId, deploymentId) as Promise<DeploymentRecord>;
}

export async function completeDeployment(tenantId: string, deploymentId: string): Promise<void> {
  const now = new Date().toISOString();
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".dos_deployments SET status = 'completed', completed_at = $1 WHERE deployment_id = $2`,
    [now, deploymentId],
  );
  await publish('delivery.deployment.completed', tenantId, { deploymentId }, {});
}

export async function failDeployment(tenantId: string, deploymentId: string, reason: string): Promise<void> {
  const now = new Date().toISOString();
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".dos_deployments SET status = 'failed', failed_at = $1, failure_reason = $2 WHERE deployment_id = $3`,
    [now, reason, deploymentId],
  );
  await publish('delivery.deployment.failed', tenantId, { deploymentId, reason }, {});
}

export async function markDeploymentRolledBack(tenantId: string, deploymentId: string, rollbackId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".dos_deployments SET status = 'rolled_back', rollback_id = $1 WHERE deployment_id = $2`,
    [rollbackId, deploymentId],
  );
}

export async function getDeployment(tenantId: string, deploymentId: string): Promise<DeploymentRecord | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dos_deployments WHERE deployment_id = $1 LIMIT 1`,
    [deploymentId],
  );
  if (!result.rows[0]) return null;
  return mapDeploymentRow(result.rows[0]);
}

export async function listDeployments(tenantId: string, environment?: string): Promise<DeploymentRecord[]> {
  const rows = await withTenantClient(tenantId, async (c) => {
    const result = environment
      ? await c.query(`SELECT * FROM dos_deployments WHERE environment = $1 ORDER BY started_at DESC`, [environment])
      : await c.query(`SELECT * FROM dos_deployments ORDER BY started_at DESC`, []);
    return result.rows;
  });
  return rows.map(mapDeploymentRow);
}

export async function getDeploymentsByRelease(tenantId: string, releaseId: string): Promise<DeploymentRecord[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dos_deployments WHERE release_id = $1 ORDER BY started_at DESC`,
    [releaseId],
  );
  return result.rows.map(mapDeploymentRow);
}

export async function getActiveDeployment(tenantId: string, environment: string): Promise<DeploymentRecord | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".dos_deployments WHERE environment = $1 AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1`,
    [environment],
  );
  if (!result.rows[0]) return null;
  return mapDeploymentRow(result.rows[0]);
}

function mapDeploymentRow(row: Record<string, any>): DeploymentRecord {
  return {
    deploymentId: row.deployment_id as string,
    releaseId: row.release_id as string,
    tenantId: row.tenant_id as string,
    environment: row.environment as string,
    status: row.status as DeploymentStatus,
    deployedBy: row.deployed_by as string,
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string) ?? null,
    failedAt: (row.failed_at as string) ?? null,
    failureReason: (row.failure_reason as string) ?? null,
    rollbackId: (row.rollback_id as string) ?? null,
  };
}
