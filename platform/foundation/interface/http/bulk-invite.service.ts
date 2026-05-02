import { randomUUID } from 'node:crypto';
import { withTenantClient } from '../../ports/database.port';
import { userMetrics } from '../../infrastructure/observability/metrics';

export interface BulkInviteRecord {
  email: string;
  role?: string;
  department_id?: string;
  display_name?: string;
}

export interface BulkInviteResultItem {
  email: string;
  status: 'invited' | 'skipped' | 'failed';
  error?: string;
}

export interface BulkInviteOutcome {
  batch_id: string;
  total: number;
  invited: number;
  skipped: number;
  failed: number;
  details: BulkInviteResultItem[];
}

function track<T>(op: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => userMetrics.observeDb(op, Date.now() - start));
}

export const BULK_INVITE_MAX = 500;

export async function runBulkInvite(tenantId: string, invites: BulkInviteRecord[]): Promise<BulkInviteOutcome> {
  const batchId = randomUUID();
  const results: BulkInviteResultItem[] = [];

  await track('foundation.bulk.invite', async () =>
    withTenantClient(tenantId, async (c) => {
      for (const invite of invites) {
        const { email, role, department_id, display_name } = invite;
        if (!email) {
          results.push({ email: email || 'unknown', status: 'skipped', error: 'email is required' });
          continue;
        }
        try {
          const existing = await c.query(
            `SELECT user_id FROM dos.users WHERE email = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
            [email, tenantId],
          );
          if (existing.rows.length) {
            results.push({ email, status: 'skipped', error: 'User already exists' });
            continue;
          }
          const userId = randomUUID();
          await c.query(
            `INSERT INTO dos.users (user_id, email, display_name, role, status, tenant_id, department_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'invited', $5, $6, NOW(), NOW())`,
            [userId, email, display_name ?? null, role ?? 'member', tenantId, department_id ?? null],
          );
          results.push({ email, status: 'invited' });
        } catch (err) {
          results.push({ email, status: 'failed', error: (err as Error).message });
        }
      }
    }),
  );

  const invited = results.filter((r) => r.status === 'invited').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed  = results.filter((r) => r.status === 'failed').length;
  return { batch_id: batchId, total: invites.length, invited, skipped, failed, details: results };
}
