/**
 * Export service — sync + async paths.
 *
 * Sync export delegates to a registered ExportEmitter that knows how to
 * stream the requested scope. Async export persists a job row and runs the
 * emitter on a worker (or inline for tests), updating progress as it goes.
 */
import type { DbClient } from '../../db/runner';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';
export type ExportStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface ExportRequest {
  tenantId: string;
  userId: string;
  scopeType: string;
  format: ExportFormat;
  query: Record<string, unknown>;
}

export interface ExportEmitterContext extends ExportRequest {
  jobId?: string;
  onProgress?: (pct: number) => void;
}

export interface ExportResult {
  contentType: string;
  body: Buffer | string;
  filename: string;
}

export type ExportEmitter = (ctx: ExportEmitterContext) => Promise<ExportResult>;

export interface ExportJob {
  id: string;
  tenantId: string;
  userId: string;
  scopeType: string;
  format: ExportFormat;
  status: ExportStatus;
  progress: number;
  query: Record<string, unknown>;
  resultUrl?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string | null;
}

export interface ExportDeps {
  client: DbClient;
  emitters: Partial<Record<string, ExportEmitter>>;
  /** Optional uploader called when async export finishes; returns a download URL. */
  upload?: (jobId: string, result: ExportResult) => Promise<string>;
  /** Async runner: defaults to inline. Production hosts can swap in a queue. */
  runAsync?: (fn: () => Promise<void>) => void;
}

const newJobId = () =>
  `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const isFormat = (s: string): s is ExportFormat => ['csv', 'xlsx', 'pdf', 'json'].includes(s);

export async function runSyncExport(deps: ExportDeps, req: ExportRequest): Promise<ExportResult> {
  const emitter = deps.emitters[req.scopeType];
  if (!emitter) throw Object.assign(new Error(`no_emitter:${req.scopeType}`), { code: 'no_emitter' });
  return emitter({ ...req });
}

export async function startAsyncExport(deps: ExportDeps, req: ExportRequest): Promise<ExportJob> {
  if (!deps.emitters[req.scopeType]) {
    throw Object.assign(new Error(`no_emitter:${req.scopeType}`), { code: 'no_emitter' });
  }
  const id = newJobId();
  await deps.client.query(
    `INSERT INTO compliance_export_jobs
       (id, tenant_id, user_id, scope_type, format, status, progress, query)
     VALUES ($1, $2, $3, $4, $5, 'queued', 0, $6::jsonb)`,
    [id, req.tenantId, req.userId, req.scopeType, req.format, JSON.stringify(req.query)],
  );

  const runner = deps.runAsync ?? ((fn) => { void fn(); });
  runner(async () => {
    try {
      await deps.client.query(
        `UPDATE compliance_export_jobs SET status='running', updated_at=NOW() WHERE id=$1`,
        [id],
      );
      const emitter = deps.emitters[req.scopeType]!;
      const result = await emitter({
        ...req,
        jobId: id,
        onProgress: async (pct) => {
          const safe = Math.max(0, Math.min(100, Math.floor(pct)));
          await deps.client.query(
            `UPDATE compliance_export_jobs SET progress=$2, updated_at=NOW() WHERE id=$1`,
            [id, safe],
          );
        },
      });
      const url = deps.upload ? await deps.upload(id, result) : null;
      await deps.client.query(
        `UPDATE compliance_export_jobs
         SET status='succeeded', progress=100, result_url=$2,
             updated_at=NOW(), finished_at=NOW()
         WHERE id=$1`,
        [id, url],
      );
    } catch (err) {
      const e = err as Error & { code?: string };
      await deps.client.query(
        `UPDATE compliance_export_jobs
         SET status='failed', error_code=$2, error_message=$3,
             updated_at=NOW(), finished_at=NOW()
         WHERE id=$1`,
        [id, e.code ?? 'export_failed', String(e.message ?? e)],
      );
    }
  });

  const fresh = await getJob(deps, id);
  if (!fresh) throw new Error(`[compliance] export job ${id} disappeared after insert`);
  return fresh;
}

export async function getJob(deps: ExportDeps, id: string): Promise<ExportJob | null> {
  const r = await deps.client.query<{
    id: string; tenant_id: string; user_id: string; scope_type: string;
    format: ExportFormat; status: ExportStatus; progress: number; query: Record<string, unknown>;
    result_url: string | null; error_code: string | null; error_message: string | null;
    created_at: string; updated_at: string; finished_at: string | null;
  }>(
    `SELECT id, tenant_id, user_id, scope_type, format, status, progress, query,
            result_url, error_code, error_message, created_at, updated_at, finished_at
     FROM compliance_export_jobs WHERE id = $1`,
    [id],
  );
  if (r.rowCount === 0) return null;
  const x = r.rows[0];
  return {
    id: x.id, tenantId: x.tenant_id, userId: x.user_id, scopeType: x.scope_type,
    format: x.format, status: x.status, progress: x.progress, query: x.query,
    resultUrl: x.result_url, errorCode: x.error_code, errorMessage: x.error_message,
    createdAt: x.created_at, updatedAt: x.updated_at, finishedAt: x.finished_at,
  };
}

export const __testing__ = { isFormat, newJobId };
