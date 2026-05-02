import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Shahin — Analytics Dashboard Service
// Dashboard configuration persistence and
// serialization/deserialization
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { DashboardConfig, DashboardWidget } from '../misc/analytics.types';
import type { GenericRow } from '@dos/types';

// === Dashboard Configuration ===

/**
 * Upserts a dashboard configuration for a user.
 * Uses INSERT ON CONFLICT to update if a config already exists for the user.
 */
export async function saveDashboardConfig(
  tenantId: string,
  userId: string,
  config: DashboardConfig
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Ensure column exists on user_preferences
  await safeQuery(`ALTER TABLE "${schema}".user_preferences ADD COLUMN IF NOT EXISTS dashboard_config JSONB`).catch(catchHandler(EC.EVENT_BUS, {}));

  const existing = await safeQuery(
    `SELECT user_id FROM "${schema}".user_preferences WHERE user_id = $1`,
    [userId]
  );

  if (existing.rows.length > 0) {
    await safeQuery(
      `UPDATE "${schema}".user_preferences
       SET dashboard_config = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [JSON.stringify(config), userId]
    );
  } else {
    await safeQuery(
      `INSERT INTO "${schema}".user_preferences (user_id, dashboard_config, updated_at)
       VALUES ($1, $2, NOW())`,
      [userId, JSON.stringify(config)]
    );
  }
}

/**
 * Retrieves the dashboard configuration for a user.
 * Returns null if no configuration exists.
 */
export async function getDashboardConfig(
  tenantId: string,
  userId: string
): Promise<DashboardConfig | null> {
  const schema = tenantSchema(tenantId);

  // Ensure column exists on user_preferences
  await safeQuery(`ALTER TABLE "${schema}".user_preferences ADD COLUMN IF NOT EXISTS dashboard_config JSONB`).catch(catchHandler(EC.EVENT_BUS, {}));

  const result = await safeQuery(
    `SELECT dashboard_config FROM "${schema}".user_preferences WHERE user_id = $1`,
    [userId]
  );
  if (result.rows.length === 0 || !getFirstRow(result)?.dashboard_config) return null;
  const raw = getFirstRow(result)?.dashboard_config;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

// === Serialization ===

/**
 * Serializes a DashboardConfig to a JSON string.
 * Produces a deterministic output with ordered keys.
 */
export function serializeDashboardConfig(config: DashboardConfig): string {
  const ordered: Record<string, unknown> = {
    widgets: config.widgets.map((w) => {
      const widget: Record<string, unknown> = {
        id: w.id,
        type: w.type,
        position: w.position,
      };
      if (w.filters !== undefined) {
        widget.filters = w.filters;
      }
      return widget;
    }),
    layout: config.layout,
  };
  if (config.theme !== undefined) {
    ordered.theme = config.theme;
  }
  return JSON.stringify(ordered);
}

/**
 * Deserializes a JSON string back into a DashboardConfig object.
 */
export function deserializeDashboardConfig(json: string): DashboardConfig {
  const parsed = JSON.parse(json);
  const config: DashboardConfig = {
    widgets: (parsed.widgets || []).map((w: GenericRow) => {
      const widget: DashboardWidget = {
        id: w.id,
        type: w.type,
        position: w.position,
      };
      if (w.filters !== undefined) {
        widget.filters = w.filters;
      }
      return widget;
    }),
    layout: parsed.layout,
  };
  if (parsed.theme !== undefined) {
    config.theme = parsed.theme;
  }
  return config;
}
