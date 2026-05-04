// Phase 1: DB-Driven Logo/Home-Link Configuration
// Backend API for i18n fallback values
//
//   GET /i18n-fallbacks/:tenantId
//     → { tenantId, fallbacks: [{ i18nKey, fallbackValueEn, fallbackValueAr }] }
//
// Reads dos.i18n_fallback_values (created by migration
// 20260505_0904_i18n_fallback_values.sql). Returns tenant-specific
// overrides plus global defaults (tenant_id=NULL).
//
// Wired via services/ui-os-service/src/routes/index.ts.

import { Router } from 'express';
import type { DbPool } from '../db.js';

interface I18nFallbackRow {
  i18n_key: string;
  fallback_value_en: string;
  fallback_value_ar: string | null;
  tenant_id: string | null;
  enabled: boolean;
}

interface I18nFallback {
  i18nKey: string;
  fallbackValueEn: string;
  fallbackValueAr: string | null;
}

export function createI18nFallbacksRouter(pool: DbPool): Router {
  const router = Router();

  router.get('/i18n-fallbacks/:tenantId', async (req, res) => {
    const tenantId = String(req.params.tenantId ?? '').trim();
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }
    try {
      // Fetch tenant-specific overrides and global defaults
      const result = await pool.query<I18nFallbackRow>(
        `SELECT i18n_key, fallback_value_en, fallback_value_ar, tenant_id, enabled
           FROM dos.i18n_fallback_values
          WHERE (tenant_id = $1 OR tenant_id IS NULL)
            AND enabled = true
          ORDER BY tenant_id DESC NULLS LAST`,
        [tenantId],
      );

      // Merge: tenant-specific overrides take precedence over global defaults
      const fallbackMap = new Map<string, I18nFallback>();
      for (const row of result.rows) {
        // Only add if not already present (tenant-specific comes first due to ORDER BY)
        if (!fallbackMap.has(row.i18n_key)) {
          fallbackMap.set(row.i18n_key, {
            i18nKey: row.i18n_key,
            fallbackValueEn: row.fallback_value_en,
            fallbackValueAr: row.fallback_value_ar,
          });
        }
      }

      res.json({
        tenantId,
        fallbacks: Array.from(fallbackMap.values()),
      });
    } catch (e) {
      res.status(500).json({
        error: 'i18n-fallbacks resolver failed',
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  });

  return router;
}
