"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveNudges = getActiveNudges;
exports.dismissNudge = dismissNudge;
const db_1 = require("@dos/db");
async function ensureNudgesTable() {
    await (0, db_1.safeQuery)(`
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
    await (0, db_1.safeQuery)(`CREATE INDEX IF NOT EXISTS user_nudges_tenant_user_idx ON public.user_nudges (tenant_id, user_id)`);
}
async function getActiveNudges(tenantId, userId, currentRoute) {
    await ensureNudgesTable();
    const result = await (0, db_1.safeQuery)(`SELECT nudge_id, title, body, route, created_at
     FROM public.user_nudges
     WHERE tenant_id = $1 AND user_id = $2 AND dismissed = FALSE
       AND ($3::text IS NULL OR route IS NULL OR route = $3)
     ORDER BY created_at DESC
     LIMIT 50`, [tenantId, userId, currentRoute ?? null]);
    return result.rows.map((row) => ({
        nudgeId: row.nudge_id,
        tenantId,
        userId,
        title: row.title,
        body: row.body ?? undefined,
        route: row.route ?? null,
        createdAt: row.created_at,
    }));
}
async function dismissNudge(tenantId, nudgeId) {
    await ensureNudgesTable();
    await (0, db_1.safeQuery)(`UPDATE public.user_nudges SET dismissed = TRUE WHERE tenant_id = $1 AND nudge_id = $2`, [tenantId, nudgeId]);
}
//# sourceMappingURL=nudges.service.js.map