import type { DbPool } from '../db.js';

export interface HelpLink {
  source: string;
  key: string;
  label: string;
  url: string | null;
  module_code: string | null;
  route_key: string | null;
}

export class UiOsHelpManager {
  constructor(private readonly pool: DbPool) {}

  async contextual(tenantId: string, moduleCode?: string | null, routeKey?: string | null): Promise<HelpLink[]> {
    const { rows } = await this.pool.query<HelpLink>(
      `SELECT 'tour'::text AS source, tour_key AS key,
              COALESCE(title_key, tour_key) AS label,
              NULL::text AS url, module_code, NULL::text AS route_key
         FROM dos.ui_tours
        WHERE is_active = TRUE
          AND (tenant_id IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR module_code = $2 OR module_code IS NULL)
        ORDER BY tour_key
        LIMIT 25`,
      [tenantId, moduleCode ?? null],
    );
    const { rows: anns } = await this.pool.query<HelpLink>(
      `SELECT 'announcement'::text AS source,
              announcement_key AS key, COALESCE(title_key, announcement_key) AS label,
              cta_url AS url, module_code, NULL::text AS route_key
         FROM dos.ui_announcements
        WHERE is_active = TRUE
          AND (tenant_id IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR module_code = $2 OR module_code IS NULL)
        ORDER BY starts_at DESC NULLS LAST
        LIMIT 10`,
      [tenantId, moduleCode ?? null],
    ).catch(() => ({ rows: [] as HelpLink[] }));
    void routeKey;
    return [...rows, ...anns];
  }
}
