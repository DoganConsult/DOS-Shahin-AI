import { safeQuery } from '@dos/db';

export interface NudgeRecord {
  nudgeId: string;
  tenantId: string;
  userId: string;
  title: string;
  body?: string;
  route?: string | null;
  createdAt: string;
}

async function ensureNudgesTable(): Promise<void> {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS public.user_nudges (
      nudge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      route TEXT,
      dismissed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await safeQuery(`CREATE INDEX IF NOT EXISTS user_nudges_tenant_user_idx ON public.user_nudges (tenant_id, user_id)`);
}

export async function getActiveNudges(tenantId: string, userId: string, currentRoute?: string): Promise<NudgeRecord[]> {
  await ensureNudgesTable();
  const result = await safeQuery(
    `SELECT nudge_id, title, body, route, created_at
     FROM public.user_nudges
     WHERE tenant_id = $1 AND user_id = $2 AND dismissed = FALSE
       AND ($3::text IS NULL OR route IS NULL OR route = $3)
     ORDER BY created_at DESC
     LIMIT 50`,
    [tenantId, userId, currentRoute ?? null],
  );
  return result.rows.map((row: any) => ({
    nudgeId: row.nudge_id,
    tenantId,
    userId,
    title: row.title,
    body: row.body ?? undefined,
    route: row.route ?? null,
    createdAt: row.created_at,
  }));
}

export async function dismissNudge(tenantId: string, nudgeId: string): Promise<void> {
  await ensureNudgesTable();
  await safeQuery(`UPDATE public.user_nudges SET dismissed = TRUE WHERE tenant_id = $1 AND nudge_id = $2`, [tenantId, nudgeId]);
}

